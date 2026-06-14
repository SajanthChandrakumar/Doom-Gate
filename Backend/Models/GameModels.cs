namespace DoomGate.Api.Models;

/// <summary>The player's token balance. Tokens are virtual and only earned by focusing.</summary>
public class Wallet
{
    public int TotalTokens { get; set; }
}

/// <summary>A live focus bet. The player "stakes" tokens on their own ability to stay focused.</summary>
public class ActiveStake
{
    public int StakedAmount { get; set; }
    public int OriginalStake { get; set; }
    public DateTime StartTime { get; set; }
    public int TargetDurationMinutes { get; set; }

    /// <summary>Payout multiplier locked in at stake time (scales with duration + streak).</summary>
    public double ProjectedMultiplier { get; set; }

    /// <summary>How many times a blocked/social distraction fired during this session.</summary>
    public int DistractionsThisSession { get; set; }

    /// <summary>True once a blocklisted app or tab-blur breach has been reported at least once.</summary>
    public bool Breached { get; set; }

    public DateTime EndTime => StartTime.AddMinutes(TargetDurationMinutes);
    public bool IsReadyToClaim => DateTime.UtcNow >= EndTime;
}

/// <summary>Long-lived player progression: levels, streaks, achievements and lifetime stats.</summary>
public class PlayerProfile
{
    public int Level { get; set; } = 1;
    public int Xp { get; set; }

    public int CurrentStreakDays { get; set; }
    public int BestStreakDays { get; set; }
    public DateTime? LastWinDateUtc { get; set; }
    public DateTime? LastDailyBonusDateUtc { get; set; }

    public int TotalFocusMinutes { get; set; }
    public int SessionsWon { get; set; }
    public int SessionsLost { get; set; }
    public int RescuesUsed { get; set; }
    public int DistractionsBlocked { get; set; }
    public int BiggestWin { get; set; }

    public HashSet<string> UnlockedAchievements { get; set; } = new();
}

/// <summary>A unlockable badge. Pure data — unlock rules live in the gamification service.</summary>
public class Achievement
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string Icon { get; init; } = "🏆";
    public int RewardTokens { get; init; }
}
