namespace DoomGate.Api.Models;

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
