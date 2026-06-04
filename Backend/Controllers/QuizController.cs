using Microsoft.AspNetCore.Mvc;
using DoomGate.Api.Models;
using DoomGate.Api.Services;

namespace DoomGate.Api.Controllers;

[ApiController]
public class QuizController : ControllerBase
{
    private readonly IGeminiService _geminiService;
    private readonly IGameStateService _gameStateService;

    public QuizController(IGeminiService geminiService, IGameStateService gameStateService)
    {
        _geminiService = geminiService;
        _gameStateService = gameStateService;
    }

    [HttpGet("api/quiz/generate")]
    public async Task<IActionResult> GenerateQuiz()
    {
        try
        {
            var quizData = await _geminiService.GenerateQuizAsync();
            if (quizData == null)
            {
                return Problem("Failed to parse AI response.");
            }

            var quizId = Guid.NewGuid().ToString();
            _gameStateService.RegisterQuiz(quizId, quizData.CorrectIndex);

            return Ok(new
            {
                quizId = quizId,
                question = quizData.Question,
                options = quizData.Options
            });
        }
        catch (InvalidOperationException ex)
        {
            return Problem(ex.Message);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
            return Problem("Failed to generate quiz");
        }
    }

    [HttpPost("api/quiz/submit")]
    public IActionResult SubmitQuiz([FromBody] SubmitRequest request)
    {
        if (string.IsNullOrEmpty(request.QuizId) || request.SelectedIndex < 0)
        {
            return BadRequest(new { error = "Missing quizId or selectedIndex" });
        }

        try
        {
            var isCorrect = _gameStateService.SubmitQuiz(request.QuizId, request.SelectedIndex, out int updatedTokens);
            
            if (isCorrect)
            {
                return Ok(new { status = "unlocked", tokens = updatedTokens });
            }
            else
            {
                return Ok(new { status = "locked", tokens = updatedTokens });
            }
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = "Quiz not found or expired" });
        }
    }
}
