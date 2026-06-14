using DoomGate.Api.Models;

namespace DoomGate.Api.Services;

/// <summary>
/// Owns the "feel good" layer: levels, streaks, achievements, daily bonuses and the
/// transparent multiplier maths. The casino calls into this whenever a session resolves.
///
/// Design note: this is deliberately *pro-social* gamification. Tokens are virtual and the
/// only way to earn them is to actually focus, so every reward reinforces the behaviour the
/// app exists to encourage (staying off distractions) rather than loss-chasing.
/// </summary>
public class GamificationService
{
    private const double BaseMultiplier = 2.0;

    // Catalogue of every badge. Unlock predicates live in EvaluateAchievements.
    public static readonly IReadOnlyList<Achievement> Catalogue = new List<Achievement>
    {
        new() { Id = "first_focus",  Name = "First Light",     Icon = "🌅", Description = "Win your very first focus session.",            RewardTokens = 50 },
        new() { Id = "marathon",     Name = "Marathoner",      Icon = "🏃", Description = "Complete a single session of 60 minutes or more.", RewardTokens = 250 },
        new() { Id = "high_roller",  Name = "High Roller",     Icon = "💎", Description = "Place a stake of 1,000 tokens or more.",          RewardTokens = 100 },
        new() { Id = "comeback",     Name = "Comeback Kid",    Icon = "🔥", Description = "Rescue a stake with the Last Chance quiz.",        RewardTokens = 75  },
        new() { Id = "iron_will",    Name = "Iron Will",       Icon = "🛡️", Description = "Win a session after resisting a distraction.",      RewardTokens = 150 },
        new() { Id = "week_warrior", Name = "Week Warrior",    Icon = "📅", Description = "Reach a 7-day focus streak.",                     RewardTokens = 500 },
        new() { Id = "level_10",     Name = "Double Digits",   Icon = "⭐", Description = "Reach level 10.",                                 RewardTokens = 300 },
        new() { Id = "whale",        Name = "Whale",           Icon = "🐋", Description = "Bank a single win of 2,000 tokens or more.",       RewardTokens = 400 },
    };

    // --- Levels -------------------------------------------------------------

    /// <summary>XP required to advance *out of* the given level. Grows linearly so progress stays brisk.</summary>
    public static int XpForLevel(int level) => 200 * level;

    public static int LevelFromXp(int xp)
    {
        var level = 1;
        var remaining = xp;
        while (remaining >= XpForLevel(level))
        {
            remaining -= XpForLevel(level);
            level++;
        }
        return level;
    }

    public static int XpIntoLevel(int xp)
    {
        var level = 1;
        var remaining = xp;
        while (remaining >= XpForLevel(level))
        {
            remaining -= XpForLevel(level);
            level++;
        }
        return remaining;
    }

    public static string TitleForLevel(int level) => level switch
    {
        >= 25 => "Focus Deity",
        >= 18 => "Zen Master",
        >= 12 => "Flow Architect",
        >= 8  => "Deep Worker",
        >= 5  => "Focused",
        >= 3  => "Apprentice",
        _     => "Distractible",
    };

    // --- Multiplier ---------------------------------------------------------

    /// <summary>
    /// Compute (and show your work for) the payout multiplier. Longer sessions and longer
    /// streaks pay more, nudging users toward deeper, more consistent focus.
    /// </summary>
    public MultiplierBreakdown BuildMultiplier(int stake, int durationMinutes, PlayerProfile profile)
    {
        // Up to +1.5 for long sessions: full bonus at 45 minutes.
        var durationBonus = Math.Round(Math.Min(durationMinutes / 30.0, 1.5), 2);
        // Up to +1.0 for hot streaks: +0.1 per consecutive day.
        var streakBonus = Math.Round(Math.Min(profile.CurrentStreakDays * 0.1, 1.0), 2);
        // Up to +0.5 for veterans: +0.05 per level above 1.
        var levelBonus = Math.Round(Math.Min((profile.Level - 1) * 0.05, 0.5), 2);

        var total = Math.Round(BaseMultiplier + durationBonus + streakBonus + levelBonus, 2);
        var payout = (int)Math.Round(stake * total);

        return new MultiplierBreakdown(BaseMultiplier, durationBonus, streakBonus, levelBonus, total, payout);
    }

    // --- Session resolution -------------------------------------------------

    /// <summary>
    /// Apply the rewards for a won session and return any freshly-unlocked achievements so the
    /// frontend can celebrate them. Mutates <paramref name="profile"/> and <paramref name="wallet"/>.
    /// </summary>
    public List<Achievement> AwardWin(PlayerProfile profile, Wallet wallet, ActiveStake stake, int winnings)
    {
        var today = DateTime.UtcNow.Date;

        // Streak: extend if yesterday, hold if already counted today, otherwise reset to 1.
        if (profile.LastWinDateUtc is { } last)
        {
            var gap = (today - last.Date).Days;
            if (gap == 1) profile.CurrentStreakDays++;
            else if (gap > 1) profile.CurrentStreakDays = 1;
            // gap == 0 -> already counted today, leave streak as-is.
        }
        else
        {
            profile.CurrentStreakDays = 1;
        }
        profile.LastWinDateUtc = today;
        profile.BestStreakDays = Math.Max(profile.BestStreakDays, profile.CurrentStreakDays);

        profile.SessionsWon++;
        profile.TotalFocusMinutes += stake.TargetDurationMinutes;
        profile.BiggestWin = Math.Max(profile.BiggestWin, winnings);
        if (stake.DistractionsThisSession > 0) profile.DistractionsBlocked++;

        AddXp(profile, stake.TargetDurationMinutes * 10);

        return EvaluateAchievements(profile, wallet, lastStakeDuration: stake.TargetDurationMinutes, lastWin: winnings);
    }

    public void RecordLoss(PlayerProfile profile)
    {
        profile.SessionsLost++;
        profile.CurrentStreakDays = 0;
    }

    public List<Achievement> RecordRescue(PlayerProfile profile, Wallet wallet)
    {
        profile.RescuesUsed++;
        AddXp(profile, 30);
        return EvaluateAchievements(profile, wallet);
    }

    public List<Achievement> NoteStakePlaced(PlayerProfile profile, Wallet wallet, int stakeAmount)
        => EvaluateAchievements(profile, wallet, lastStakeAmount: stakeAmount);

    private void AddXp(PlayerProfile profile, int xp)
    {
        profile.Xp += xp;
        profile.Level = LevelFromXp(profile.Xp);
    }

    private List<Achievement> EvaluateAchievements(
        PlayerProfile profile, Wallet wallet,
        int lastStakeDuration = 0, int lastWin = 0, int lastStakeAmount = 0)
    {
        var unlocked = new List<Achievement>();

        void TryUnlock(string id, bool condition)
        {
            if (!condition || profile.UnlockedAchievements.Contains(id)) return;
            var def = Catalogue.FirstOrDefault(a => a.Id == id);
            if (def is null) return;
            profile.UnlockedAchievements.Add(id);
            wallet.TotalTokens += def.RewardTokens;
            unlocked.Add(def);
        }

        TryUnlock("first_focus",  profile.SessionsWon >= 1);
        TryUnlock("marathon",     lastStakeDuration >= 60);
        TryUnlock("high_roller",  lastStakeAmount >= 1000);
        TryUnlock("comeback",     profile.RescuesUsed >= 1);
        TryUnlock("iron_will",    lastWin > 0 && profile.DistractionsBlocked >= 1);
        TryUnlock("week_warrior", profile.BestStreakDays >= 7);
        TryUnlock("level_10",     profile.Level >= 10);
        TryUnlock("whale",        lastWin >= 2000);

        return unlocked;
    }

    // --- Daily bonus --------------------------------------------------------

    public bool IsDailyBonusAvailable(PlayerProfile profile)
        => profile.LastDailyBonusDateUtc?.Date != DateTime.UtcNow.Date;

    /// <summary>
    /// A once-per-day variable reward that scales with progression — a friendly reason to come
    /// back tomorrow. Returns the granted amount, or null if already claimed today.
    /// </summary>
    public int? ClaimDailyBonus(PlayerProfile profile, Wallet wallet)
    {
        if (!IsDailyBonusAvailable(profile)) return null;

        var rng = Random.Shared;
        var baseReward = 50 + profile.Level * 10 + profile.CurrentStreakDays * 5;
        var jitter = rng.Next(-15, 26); // a little variance keeps it fun
        var reward = Math.Max(25, baseReward + jitter);

        wallet.TotalTokens += reward;
        profile.LastDailyBonusDateUtc = DateTime.UtcNow.Date;
        return reward;
    }

    // --- Leaderboard --------------------------------------------------------

    // Friendly "rivals" to race against — a little social pressure, no real accounts needed.
    private static readonly (string Name, int Tokens)[] Rivals =
    {
        ("FocusNinja",   4820),
        ("DeepWorkDan",  3110),
        ("ZenZara",      2640),
        ("GrindGremlin", 1985),
        ("FlowFizz",     1420),
        ("TabHoarder",    640),
        ("DoomScroller",  180),
    };

    /// <summary>Blend the player into the rival board, sorted by tokens, with ranks assigned.</summary>
    public IReadOnlyList<object> BuildLeaderboard(int playerTokens, string playerTitle)
    {
        var rows = Rivals
            .Select(r => (r.Name, r.Tokens, IsYou: false))
            .Append(($"You · {playerTitle}", playerTokens, true))
            .OrderByDescending(r => r.Tokens)
            .Select((r, i) => (object)new { rank = i + 1, name = r.Name, tokens = r.Tokens, isYou = r.IsYou })
            .ToList();
        return rows;
    }

    // --- Summary ------------------------------------------------------------

    public PlayerSummary BuildSummary(PlayerProfile profile) => new(
        Level: profile.Level,
        Xp: profile.Xp,
        XpIntoLevel: XpIntoLevel(profile.Xp),
        XpForNextLevel: XpForLevel(profile.Level),
        CurrentStreakDays: profile.CurrentStreakDays,
        BestStreakDays: profile.BestStreakDays,
        Title: TitleForLevel(profile.Level),
        DailyBonusAvailable: IsDailyBonusAvailable(profile));
}
