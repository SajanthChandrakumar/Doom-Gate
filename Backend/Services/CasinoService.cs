using DoomGate.Api.Models;

namespace DoomGate.Api.Services;

/// <summary>
/// The betting engine. Owns the lifecycle of a focus stake — place, claim, liquidate — and
/// delegates all progression side-effects to <see cref="GamificationService"/>. Endpoints stay
/// thin because every rule lives here.
/// </summary>
public class CasinoService
{
    private readonly GameState _state;
    private readonly GamificationService _gamification;

    public CasinoService(GameState state, GamificationService gamification)
    {
        _state = state;
        _gamification = gamification;
    }

    public CasinoStateResponse GetState() => _state.Read(() =>
    {
        var stake = _state.ActiveStake;
        MultiplierBreakdown? projected = stake is null
            ? null
            : _gamification.BuildMultiplier(stake.StakedAmount, stake.TargetDurationMinutes, _state.Profile);

        return new CasinoStateResponse(
            _state.Wallet.TotalTokens,
            stake,
            projected,
            _gamification.BuildSummary(_state.Profile));
    });

    public ServiceResult PlaceStake(StakeRequest request) => _state.Mutate(() =>
    {
        if (request.StakeAmount <= 0 || request.DurationMinutes <= 0)
            return ServiceResult.Fail("Enter a positive stake and duration.");

        if (_state.ActiveStake is not null)
            return ServiceResult.Fail("You already have an active stake. Focus!");

        if (_state.Wallet.TotalTokens < request.StakeAmount)
            return ServiceResult.Fail("Not enough tokens to cover that stake.");

        var breakdown = _gamification.BuildMultiplier(request.StakeAmount, request.DurationMinutes, _state.Profile);

        _state.Wallet.TotalTokens -= request.StakeAmount;
        _state.ActiveStake = new ActiveStake
        {
            StakedAmount = request.StakeAmount,
            OriginalStake = request.StakeAmount,
            StartTime = DateTime.UtcNow,
            TargetDurationMinutes = request.DurationMinutes,
            ProjectedMultiplier = breakdown.Total,
        };

        var unlocked = _gamification.NoteStakePlaced(_state.Profile, _state.Wallet, request.StakeAmount);

        return ServiceResult.Success(new
        {
            success = true,
            newBalance = _state.Wallet.TotalTokens,
            activeStake = _state.ActiveStake,
            projectedPayout = breakdown,
            unlockedAchievements = unlocked,
            player = _gamification.BuildSummary(_state.Profile),
        });
    });

    public ServiceResult Claim() => _state.Mutate(() =>
    {
        var stake = _state.ActiveStake;
        if (stake is null)
            return ServiceResult.Fail("No active stake to claim.");

        if (!stake.IsReadyToClaim)
            return ServiceResult.Fail($"Focus time isn't over yet — finishes at {stake.EndTime.ToLocalTime():HH:mm:ss}.");

        var breakdown = _gamification.BuildMultiplier(stake.StakedAmount, stake.TargetDurationMinutes, _state.Profile);
        var winnings = breakdown.PotentialPayout;

        _state.Wallet.TotalTokens += winnings;
        var unlocked = _gamification.AwardWin(_state.Profile, _state.Wallet, stake, winnings);
        _state.ActiveStake = null;

        return ServiceResult.Success(new
        {
            status = "won",
            winnings,
            multiplier = breakdown.Total,
            newBalance = _state.Wallet.TotalTokens,
            unlockedAchievements = unlocked,
            player = _gamification.BuildSummary(_state.Profile),
        });
    });

    public ServiceResult Liquidate(string reason = "distracted") => _state.Mutate(() =>
    {
        if (_state.ActiveStake is null)
            return ServiceResult.Fail("No active stake to liquidate.");

        _gamification.RecordLoss(_state.Profile);
        _state.ActiveStake = null;

        return ServiceResult.Success(new
        {
            status = "liquidated",
            reason,
            newBalance = _state.Wallet.TotalTokens,
            player = _gamification.BuildSummary(_state.Profile),
        });
    });
}
