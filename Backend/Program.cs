using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure CORS to allow the frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins("http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173", "http://localhost:8080")
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

// Configure HttpClient for Gemini
builder.Services.AddHttpClient("Gemini", client =>
{
    client.BaseAddress = new Uri("https://generativelanguage.googleapis.com/");
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
// app.UseHttpsRedirection(); // Auskommentiert für einfachere lokale Entwicklung

// --- In-Memory Database ---
var userState = new UserState
{
    FocusTokens = 150,
    UnlockedNodes = new List<string> { "root" }
};

var activeQuizzes = new Dictionary<string, QuizSession>();

// --- API Endpoints ---

// 1. The Wallet & Tech-Tree Engine
app.MapGet("/api/state", () =>
{
    return Results.Ok(userState);
});

app.MapPost("/api/shop/unlock", ([FromBody] UnlockRequest request) =>
{
    if (string.IsNullOrEmpty(request.NodeId) || request.Cost < 0)
    {
        return Results.BadRequest(new { error = "Missing nodeId or invalid cost" });
    }

    if (userState.UnlockedNodes.Contains(request.NodeId))
    {
        return Results.BadRequest(new { error = "Node already unlocked" });
    }

    if (userState.FocusTokens >= request.Cost)
    {
        userState.FocusTokens -= request.Cost;
        userState.UnlockedNodes.Add(request.NodeId);
        return Results.Ok(new { success = true, remainingTokens = userState.FocusTokens });
    }
    else
    {
        return Results.BadRequest(new { error = "Not enough focus tokens" });
    }
});

// 2. The Gemini Quiz Engine
app.MapGet("/api/quiz/generate", async (IHttpClientFactory clientFactory, IConfiguration config) =>
{
    var apiKey = config["Gemini:ApiKey"];
    // Also check environment variable if not in appsettings
    apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY") ?? apiKey;

    if (string.IsNullOrEmpty(apiKey))
    {
        return Results.Problem("Gemini API Key is not configured on the server.");
    }

    var client = clientFactory.CreateClient("Gemini");
    var url = $"v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";

    var prompt = @"
      Generate a multiple-choice trivia or computer science question.
      Provide exactly 3 options.
      Return the response in strict JSON format with the following structure:
      {
        ""question"": ""The question text"",
        ""options"": [""Option 1"", ""Option 2"", ""Option 3""],
        ""correctIndex"": 0
      }
      The correctIndex must be an integer (0, 1, or 2) corresponding to the correct option.
      Do not include any Markdown formatting like ```json or ```. Just return the raw JSON object.";

    var requestBody = new
    {
        contents = new[]
        {
            new { parts = new[] { new { text = prompt } } }
        },
        generationConfig = new
        {
            responseMimeType = "application/json"
        }
    };

    try
    {
        var response = await client.PostAsJsonAsync(url, requestBody);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            Console.WriteLine($"Gemini API Error: {errorBody}");
            return Results.Problem("Failed to generate quiz from AI.");
        }

        var responseJson = await response.Content.ReadFromJsonAsync<GeminiResponse>();
        var textResult = responseJson?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;

        if (textResult == null)
        {
            return Results.Problem("Invalid response format from AI.");
        }

        var quizData = JsonSerializer.Deserialize<QuizData>(textResult, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        
        if (quizData == null)
        {
            return Results.Problem("Failed to parse AI response.");
        }

        var quizId = Guid.NewGuid().ToString();
        activeQuizzes[quizId] = new QuizSession { CorrectIndex = quizData.CorrectIndex };

        return Results.Ok(new
        {
            quizId = quizId,
            question = quizData.Question,
            options = quizData.Options
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error: {ex.Message}");
        return Results.Problem("Failed to generate quiz");
    }
});

app.MapPost("/api/quiz/submit", ([FromBody] SubmitRequest request) =>
{
    if (string.IsNullOrEmpty(request.QuizId) || request.SelectedIndex < 0)
    {
        return Results.BadRequest(new { error = "Missing quizId or selectedIndex" });
    }

    if (!activeQuizzes.TryGetValue(request.QuizId, out var quiz))
    {
        return Results.NotFound(new { error = "Quiz not found or expired" });
    }

    activeQuizzes.Remove(request.QuizId);

    if (request.SelectedIndex == quiz.CorrectIndex)
    {
        userState.FocusTokens += 10;
        return Results.Ok(new { status = "unlocked", tokens = userState.FocusTokens });
    }
    else
    {
        userState.FocusTokens = Math.Max(0, userState.FocusTokens - 5);
        return Results.Ok(new { status = "locked", tokens = userState.FocusTokens });
    }
});

app.Run();

// --- Models ---
public class UserState
{
    public int FocusTokens { get; set; }
    public List<string> UnlockedNodes { get; set; } = new();
}

public class QuizSession
{
    public int CorrectIndex { get; set; }
}

public class UnlockRequest
{
    public string NodeId { get; set; } = string.Empty;
    public int Cost { get; set; }
}

public class SubmitRequest
{
    public string QuizId { get; set; } = string.Empty;
    public int SelectedIndex { get; set; }
}

public class QuizData
{
    public string Question { get; set; } = string.Empty;
    public List<string> Options { get; set; } = new();
    public int CorrectIndex { get; set; }
}

public class GeminiResponse
{
    public List<Candidate> Candidates { get; set; } = new();
}

public class Candidate
{
    public Content Content { get; set; } = new();
}

public class Content
{
    public List<Part> Parts { get; set; } = new();
}

public class Part
{
    public string Text { get; set; } = string.Empty;
}
