using System.Collections.Concurrent;
using System.Net.Http.Json;
using System.Text.Json;
using DoomGate.Api.Models;

namespace DoomGate.Api.Services;

/// <summary>
/// Powers the "Last Chance" rescue. Generates a multiple-choice question (via Gemini when a key
/// is configured, otherwise from a built-in bank so the app always works) and validates answers.
/// A correct answer rescues the stake for a 10% fee; a wrong answer liquidates it.
///
/// The correct index is kept server-side, keyed by a one-shot quiz id, so it never reaches the
/// client.
/// </summary>
public class QuizService
{
    private readonly GameState _state;
    private readonly GamificationService _gamification;
    private readonly CasinoService _casino;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<QuizService> _logger;

    private readonly ConcurrentDictionary<string, QuizSession> _sessions = new();

    public QuizService(
        GameState state,
        GamificationService gamification,
        CasinoService casino,
        IHttpClientFactory httpClientFactory,
        IConfiguration config,
        ILogger<QuizService> logger)
    {
        _state = state;
        _gamification = gamification;
        _casino = casino;
        _httpClientFactory = httpClientFactory;
        _config = config;
        _logger = logger;
    }

    public async Task<ServiceResult> GenerateAsync()
    {
        var quiz = await TryGenerateFromGeminiAsync() ?? PickFromBank();

        var quizId = Guid.NewGuid().ToString();
        _sessions[quizId] = new QuizSession { CorrectIndex = quiz.CorrectIndex };

        return ServiceResult.Success(new
        {
            quizId,
            question = quiz.Question,
            options = quiz.Options,
        });
    }

    public ServiceResult Submit(SubmitQuizRequest request)
    {
        if (string.IsNullOrEmpty(request.QuizId) || request.SelectedIndex < 0)
            return ServiceResult.Fail("Missing quizId or selectedIndex.");

        if (!_sessions.TryRemove(request.QuizId, out var quiz))
            return ServiceResult.Fail("That quiz has expired. Generate a new one.");

        return _state.Mutate(() =>
        {
            var stake = _state.ActiveStake;
            if (stake is null)
                return ServiceResult.Fail("No active stake to rescue.");

            if (request.SelectedIndex == quiz.CorrectIndex)
            {
                var penalty = (int)(stake.StakedAmount * 0.1);
                stake.StakedAmount -= penalty;
                var unlocked = _gamification.RecordRescue(_state.Profile, _state.Wallet);

                return ServiceResult.Success(new
                {
                    status = "saved",
                    penalty,
                    activeStake = stake,
                    unlockedAchievements = unlocked,
                    player = _gamification.BuildSummary(_state.Profile),
                });
            }

            var liquidation = _casino.Liquidate(reason: "failed-rescue");
            return ServiceResult.Success(new
            {
                status = "liquidated",
                newBalance = _state.Wallet.TotalTokens,
                player = _gamification.BuildSummary(_state.Profile),
                liquidation = liquidation.Data,
            });
        });
    }

    // --- Generation sources -------------------------------------------------

    private async Task<QuizData?> TryGenerateFromGeminiAsync()
    {
        var apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY") ?? _config["Gemini:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            return null; // No key configured — fall back to the local bank.

        try
        {
            var client = _httpClientFactory.CreateClient("Gemini");
            var url = $"v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";

            const string prompt = """
                Generate a single multiple-choice computer science question with exactly 3 options.
                Return strict raw JSON, no markdown fences, in this shape:
                { "question": "...", "options": ["a","b","c"], "correctIndex": 0 }
                correctIndex is an integer 0, 1 or 2.
                """;

            var body = new
            {
                contents = new[] { new { parts = new[] { new { text = prompt } } } },
                generationConfig = new { responseMimeType = "application/json" },
            };

            var response = await client.PostAsJsonAsync(url, body);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Gemini returned {Status}; using local quiz bank.", response.StatusCode);
                return null;
            }

            var parsed = await response.Content.ReadFromJsonAsync<GeminiResponse>();
            var text = parsed?.Candidates.FirstOrDefault()?.Content.Parts.FirstOrDefault()?.Text;
            if (string.IsNullOrWhiteSpace(text)) return null;

            var quiz = JsonSerializer.Deserialize<QuizData>(text, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (quiz is null || quiz.Options.Count < 2) return null;

            return quiz;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Gemini quiz generation failed; using local quiz bank.");
            return null;
        }
    }

    private static readonly QuizData[] Bank =
    {
        new() { Question = "What does CPU stand for?", Options = { "Central Processing Unit", "Computer Personal Unit", "Central Process Utility" }, CorrectIndex = 0 },
        new() { Question = "Which data structure uses FIFO ordering?", Options = { "Stack", "Queue", "Tree" }, CorrectIndex = 1 },
        new() { Question = "What is the time complexity of binary search?", Options = { "O(n)", "O(n log n)", "O(log n)" }, CorrectIndex = 2 },
        new() { Question = "Which keyword makes a JavaScript variable block-scoped?", Options = { "let", "var", "global" }, CorrectIndex = 0 },
        new() { Question = "In Big-O, which is fastest for large n?", Options = { "O(n^2)", "O(n)", "O(1)" }, CorrectIndex = 2 },
        new() { Question = "What does HTTP status 404 mean?", Options = { "Server Error", "Not Found", "Unauthorized" }, CorrectIndex = 1 },
        new() { Question = "Which protocol is connectionless?", Options = { "TCP", "UDP", "FTP" }, CorrectIndex = 1 },
        new() { Question = "What does 'git' primarily manage?", Options = { "Version control", "Database indexing", "Memory allocation" }, CorrectIndex = 0 },
        new() { Question = "Which sorting algorithm is divide-and-conquer?", Options = { "Bubble sort", "Merge sort", "Insertion sort" }, CorrectIndex = 1 },
        new() { Question = "What is a hash collision?", Options = { "Two keys mapping to one slot", "A network timeout", "A failed compile" }, CorrectIndex = 0 },
    };

    private static QuizData PickFromBank() => Bank[Random.Shared.Next(Bank.Length)];
}
