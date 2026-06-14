namespace DoomGate.Api.Models;

// --- Requests ---

public record StakeRequest(int StakeAmount, int DurationMinutes);

public record SubmitQuizRequest(string QuizId, int SelectedIndex);

/// <summary>Reports that the user touched a (possibly distracting) app/surface.
/// <c>App</c> is a slug like "instagram", "tiktok" or "tab-blur".
/// <c>Source</c> is informational: "ios-shortcut", "browser", etc.</summary>
public record DistractionReport(string App, string? Source = null);

// --- Responses ---

public record CasinoStateResponse(
    int TotalTokens,
    ActiveStake? ActiveStake,
    MultiplierBreakdown? ProjectedPayout,
    PlayerSummary Player);

/// <summary>Lightweight progression snapshot shipped alongside most responses so the
/// HUD can update without an extra round-trip.</summary>
public record PlayerSummary(
    int Level,
    int Xp,
    int XpIntoLevel,
    int XpForNextLevel,
    int CurrentStreakDays,
    int BestStreakDays,
    string Title,
    bool DailyBonusAvailable);

/// <summary>Transparent, itemised breakdown of how a payout multiplier was computed.
/// Showing the maths is part of the fun — and keeps it honest.</summary>
public record MultiplierBreakdown(
    double Base,
    double DurationBonus,
    double StreakBonus,
    double LevelBonus,
    double Total,
    int PotentialPayout);

public record ServiceResult(bool Ok, string? Error = null, object? Data = null)
{
    public static ServiceResult Fail(string error) => new(false, error);
    public static ServiceResult Success(object? data = null) => new(true, Data: data);
}
