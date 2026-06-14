using DoomGate.Api.Models;
using DoomGate.Api.Services;

namespace DoomGate.Api.Endpoints;

public static class PlayerEndpoints
{
    public static void MapPlayerEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/player").WithTags("Player");

        group.MapGet("/profile", (GameState state, GamificationService gamification)
            => state.Read(() => Results.Ok(new
            {
                profile = state.Profile,
                summary = gamification.BuildSummary(state.Profile),
            })));

        // Full badge catalogue with unlocked status — drives the trophy case in the UI.
        group.MapGet("/achievements", (GameState state)
            => state.Read(() => Results.Ok(
                GamificationService.Catalogue.Select(a => new
                {
                    a.Id,
                    a.Name,
                    a.Description,
                    a.Icon,
                    a.RewardTokens,
                    unlocked = state.Profile.UnlockedAchievements.Contains(a.Id),
                }))));

        group.MapPost("/daily-bonus", (GameState state, GamificationService gamification)
            => state.Mutate(() =>
            {
                var reward = gamification.ClaimDailyBonus(state.Profile, state.Wallet);
                return reward is null
                    ? Results.BadRequest(new { error = "Daily bonus already claimed. Come back tomorrow!" })
                    : Results.Ok(new
                    {
                        reward,
                        newBalance = state.Wallet.TotalTokens,
                        player = gamification.BuildSummary(state.Profile),
                    });
            }));

        group.MapGet("/leaderboard", (GameState state, GamificationService gamification)
            => state.Read(() => Results.Ok(new
            {
                entries = gamification.BuildLeaderboard(
                    state.Wallet.TotalTokens,
                    GamificationService.TitleForLevel(state.Profile.Level)),
            })));
    }
}
