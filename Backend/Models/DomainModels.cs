namespace DoomGate.Api.Models;

public class UserState
{
    public int FocusTokens { get; set; }
    public List<string> UnlockedNodes { get; set; } = new();
}

public class QuizSession
{
    public int CorrectIndex { get; set; }
}
