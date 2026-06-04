using System.Collections.Concurrent;
using DoomGate.Api.Models;

namespace DoomGate.Api.Services;

public class GameStateService : IGameStateService
{
    private readonly UserState _userState;
    private readonly ConcurrentDictionary<string, QuizSession> _activeQuizzes;

    public GameStateService()
    {
        _userState = new UserState
        {
            FocusTokens = 150,
            UnlockedNodes = new List<string> { "root" }
        };
        _activeQuizzes = new ConcurrentDictionary<string, QuizSession>();
    }

    public UserState GetState()
    {
        return _userState;
    }

    public bool UnlockNode(string nodeId, int cost)
    {
        lock (_userState)
        {
            if (_userState.UnlockedNodes.Contains(nodeId))
                return false;

            if (_userState.FocusTokens >= cost)
            {
                _userState.FocusTokens -= cost;
                _userState.UnlockedNodes.Add(nodeId);
                return true;
            }

            return false;
        }
    }

    public void RegisterQuiz(string quizId, int correctIndex)
    {
        _activeQuizzes[quizId] = new QuizSession { CorrectIndex = correctIndex };
    }

    public bool SubmitQuiz(string quizId, int selectedIndex, out int updatedTokens)
    {
        if (_activeQuizzes.TryRemove(quizId, out var quiz))
        {
            lock (_userState)
            {
                if (selectedIndex == quiz.CorrectIndex)
                {
                    _userState.FocusTokens += 10;
                    updatedTokens = _userState.FocusTokens;
                    return true;
                }
                else
                {
                    _userState.FocusTokens = Math.Max(0, _userState.FocusTokens - 5);
                    updatedTokens = _userState.FocusTokens;
                    return false;
                }
            }
        }

        updatedTokens = _userState.FocusTokens;
        throw new KeyNotFoundException("Quiz not found or expired.");
    }
}
