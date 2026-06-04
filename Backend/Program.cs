using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure CORS
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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");

// --- In-Memory State Management ---
var wallet = new Wallet { TotalTokens = 500 };
ActiveStake? currentStake = null;
var activeQuizzes = new Dictionary<string, QuizSession>();

// --- API Endpoints: Casino Engine ---

app.MapGet("/api/casino/state", () =>
{
    return Results.Ok(new CasinoStateResponse
    {
        TotalTokens = wallet.TotalTokens,
        ActiveStake = currentStake
    });
});

app.MapPost("/api/casino/stake", ([FromBody] StakeRequest request) =>
{
    if (request.StakeAmount <= 0 || request.DurationMinutes <= 0)
    {
        return Results.BadRequest(new { error = "Invalid stake amount or duration." });
    }

    if (currentStake != null)
    {
        return Results.BadRequest(new { error = "You already have an active stake. Focus!" });
    }

    if (wallet.TotalTokens < request.StakeAmount)
    {
        return Results.BadRequest(new { error = "Not enough tokens to stake." });
    }

    // Deduct tokens and create stake
    wallet.TotalTokens -= request.StakeAmount;
    currentStake = new ActiveStake
    {
        StakedAmount = request.StakeAmount,
        StartTime = DateTime.UtcNow,
        TargetDurationMinutes = request.DurationMinutes
    };

    return Results.Ok(new { success = true, newBalance = wallet.TotalTokens, activeStake = currentStake });
});

app.MapPost("/api/casino/liquidate", () =>
{
    if (currentStake == null)
    {
        return Results.BadRequest(new { error = "No active stake to liquidate." });
    }

    // Destroy the stake completely
    currentStake = null;
    return Results.Ok(new { status = "liquidated", newBalance = wallet.TotalTokens });
});

app.MapPost("/api/casino/claim", () =>
{
    if (currentStake == null)
    {
        return Results.BadRequest(new { error = "No active stake to claim." });
    }

    var endTime = currentStake.StartTime.AddMinutes(currentStake.TargetDurationMinutes);
    if (DateTime.UtcNow < endTime)
    {
        return Results.BadRequest(new { error = $"Focus time not over yet. Finishes at {endTime.ToLocalTime():HH:mm:ss}" });
    }

    // Win condition: Add StakedAmount * 2 to wallet
    var winnings = currentStake.StakedAmount * 2;
    wallet.TotalTokens += winnings;
    currentStake = null;

    return Results.Ok(new { status = "won", winnings, newBalance = wallet.TotalTokens });
});

// --- API Endpoints: Gemini Quiz Engine ---

app.MapGet("/api/quiz/generate", async (IHttpClientFactory clientFactory, IConfiguration config) =>
{
    var apiKey = config["Gemini:ApiKey"];
    apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY") ?? apiKey;

    if (string.IsNullOrEmpty(apiKey))
    {
        return Results.Problem("Gemini API Key is not configured on the server.");
    }

    var client = clientFactory.CreateClient("Gemini");
    var url = $"v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";

    var prompt = @"
      Generate a multiple-choice computer science question.
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

        if (textResult == null) return Results.Problem("Invalid response format from AI.");

        var quizData = JsonSerializer.Deserialize<QuizData>(textResult, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        
        if (quizData == null) return Results.Problem("Failed to parse AI response.");

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

app.MapPost("/api/quiz/submit", ([FromBody] SubmitQuizRequest request) =>
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

    if (currentStake == null)
    {
         return Results.BadRequest(new { error = "No active stake to save." });
    }

    if (request.SelectedIndex == quiz.CorrectIndex)
    {
        // Saved! Apply 10% penalty to the staked amount as a "rescue fee"
        int penalty = (int)(currentStake.StakedAmount * 0.1);
        currentStake.StakedAmount -= penalty;
        
        return Results.Ok(new { status = "saved", penalty, currentStake });
    }
    else
    {
        // Wrong answer -> immediate liquidation
        currentStake = null;
        return Results.Ok(new { status = "liquidated", newBalance = wallet.TotalTokens });
    }
});

app.Run();

// --- Models ---
public class Wallet
{
    public int TotalTokens { get; set; }
}

public class ActiveStake
{
    public int StakedAmount { get; set; }
    public DateTime StartTime { get; set; }
    public int TargetDurationMinutes { get; set; }
}

public class CasinoStateResponse
{
    public int TotalTokens { get; set; }
    public ActiveStake? ActiveStake { get; set; }
}

public class StakeRequest
{
    public int StakeAmount { get; set; }
    public int DurationMinutes { get; set; }
}

public class SubmitQuizRequest
{
    public string QuizId { get; set; } = string.Empty;
    public int SelectedIndex { get; set; }
}

public class QuizSession
{
    public int CorrectIndex { get; set; }
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
