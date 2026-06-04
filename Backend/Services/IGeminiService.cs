using DoomGate.Api.Models;

namespace DoomGate.Api.Services;

public interface IGeminiService
{
    Task<QuizData?> GenerateQuizAsync();
}
