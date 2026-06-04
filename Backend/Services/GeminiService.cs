using System.Text.Json;
using DoomGate.Api.Models;

namespace DoomGate.Api.Services;

public class GeminiService : IGeminiService
{
    private readonly HttpClient _httpClient;
    private readonly string? _apiKey;

    public GeminiService(IHttpClientFactory clientFactory, IConfiguration config)
    {
        _httpClient = clientFactory.CreateClient("Gemini");
        _apiKey = config["Gemini:ApiKey"];
        _apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY") ?? _apiKey;
    }

    public async Task<QuizData?> GenerateQuizAsync()
    {
        if (string.IsNullOrEmpty(_apiKey))
            throw new InvalidOperationException("Gemini API Key is not configured.");

        var url = $"v1beta/models/gemini-2.5-flash:generateContent?key={_apiKey}";

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

        var response = await _httpClient.PostAsJsonAsync(url, requestBody);
        
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException($"Gemini API Error: {errorBody}");
        }

        var responseJson = await response.Content.ReadFromJsonAsync<GeminiResponse>();
        var textResult = responseJson?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;

        if (textResult == null)
            return null;

        return JsonSerializer.Deserialize<QuizData>(textResult, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
    }
}
