using System.Text.Json.Serialization;

namespace DoomGate.Api.Models;

/// <summary>Server-side memory of an in-flight rescue quiz. The answer never leaves the server.</summary>
public class QuizSession
{
    public int CorrectIndex { get; set; }
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
}

/// <summary>Normalised quiz shape, whether sourced from Gemini or the local fallback bank.</summary>
public class QuizData
{
    public string Question { get; set; } = string.Empty;
    public List<string> Options { get; set; } = new();
    public int CorrectIndex { get; set; }
}

// --- Gemini REST response shapes (only the fields we read) ---

public class GeminiResponse
{
    [JsonPropertyName("candidates")]
    public List<GeminiCandidate> Candidates { get; set; } = new();
}

public class GeminiCandidate
{
    [JsonPropertyName("content")]
    public GeminiContent Content { get; set; } = new();
}

public class GeminiContent
{
    [JsonPropertyName("parts")]
    public List<GeminiPart> Parts { get; set; } = new();
}

public class GeminiPart
{
    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;
}
