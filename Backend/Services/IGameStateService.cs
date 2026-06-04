using DoomGate.Api.Models;

namespace DoomGate.Api.Services;

public interface IGameStateService
{
    UserState GetState();
    bool UnlockNode(string nodeId, int cost);
    void RegisterQuiz(string quizId, int correctIndex);
    bool SubmitQuiz(string quizId, int selectedIndex, out int updatedTokens);
}
