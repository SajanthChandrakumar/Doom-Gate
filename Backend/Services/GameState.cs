using DoomGate.Api.Models;

namespace DoomGate.Api.Services;

/// <summary>
/// Single source of truth for the (currently single-player) game world, held in memory.
/// Every mutation goes through <see cref="Mutate"/> so access stays serialised — this keeps
/// the services free of locking concerns and makes the state trivially swappable for a real
/// store later.
/// </summary>
public class GameState
{
    private readonly object _gate = new();

    public Wallet Wallet { get; } = new() { TotalTokens = 500 };
    public ActiveStake? ActiveStake { get; set; }
    public PlayerProfile Profile { get; } = new();

    /// <summary>Run <paramref name="action"/> with exclusive access to the world and return its value.</summary>
    public T Mutate<T>(Func<T> action)
    {
        lock (_gate)
        {
            return action();
        }
    }

    /// <summary>Read a snapshot under the lock.</summary>
    public T Read<T>(Func<T> reader)
    {
        lock (_gate)
        {
            return reader();
        }
    }
}
