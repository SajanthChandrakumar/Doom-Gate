using DoomGate.Api.Models;

namespace DoomGate.Api.Services;

/// <summary>
/// The enforcement arm of Doom-Gate. Distraction signals arrive here from two relays:
///   1. the browser tab (Page Visibility / blur), and
///   2. an iOS Screen Time "personal automation" that fires a Shortcut → webhook when a
///      blocklisted app (Instagram, TikTok, …) is opened.
///
/// Policy is a forgiving two-strike system, which is both fairer and more *engaging* than an
/// instant kill: the first breach forces a Last Chance rescue; a second breach in the same
/// session liquidates the stake. Resisting a breach and still winning earns the Iron Will badge.
/// </summary>
public class FocusGuardService
{
    private readonly GameState _state;
    private readonly CasinoService _casino;

    // Apps that count as a "breach" while a stake is active.
    private static readonly HashSet<string> Blocklist = new(StringComparer.OrdinalIgnoreCase)
    {
        "instagram", "tiktok", "twitter", "x", "facebook", "youtube",
        "reddit", "snapchat", "threads", "twitch", "tab-blur",
    };

    public FocusGuardService(GameState state, CasinoService casino)
    {
        _state = state;
        _casino = casino;
    }

    public IReadOnlyCollection<string> GetBlocklist() => Blocklist.ToArray();

    public ServiceResult Report(DistractionReport report) => _state.Mutate(() =>
    {
        var app = (report.App ?? string.Empty).Trim().ToLowerInvariant();
        var pretty = Prettify(app);

        if (!Blocklist.Contains(app))
            return ServiceResult.Success(new { blocked = false, app = pretty });

        var stake = _state.ActiveStake;
        if (stake is null)
        {
            // Nothing on the line — just acknowledge so the client can nudge the user.
            return ServiceResult.Success(new { blocked = true, idle = true, app = pretty, action = "none" });
        }

        stake.DistractionsThisSession++;
        stake.Breached = true;

        if (stake.DistractionsThisSession == 1)
        {
            // First strike: a warning shot. The stake survives but the player must rescue it.
            return ServiceResult.Success(new
            {
                blocked = true,
                action = "rescue",
                strikes = 1,
                app = pretty,
                message = $"⚠️ {pretty} detected. One strike. Pass the Last Chance quiz or kiss your stake goodbye.",
            });
        }

        // Second strike: enforcement. Liquidate.
        var result = _casino.Liquidate(reason: $"breach:{app}");
        return ServiceResult.Success(new
        {
            blocked = true,
            action = "liquidated",
            strikes = stake.DistractionsThisSession,
            app = pretty,
            message = $"💀 {pretty} again. Stake liquidated. Doom-Gate doesn't bluff.",
            liquidation = (result.Data as object),
        });
    });

    private static string Prettify(string app) => app switch
    {
        "tab-blur" => "Tab switch",
        "x" or "twitter" => "X / Twitter",
        "" => "Unknown app",
        _ => char.ToUpperInvariant(app[0]) + app[1..],
    };
}
