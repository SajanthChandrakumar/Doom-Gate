using DoomGate.Api.Models;
using DoomGate.Api.Services;

namespace DoomGate.Api.Endpoints;

public static class QuizEndpoints
{
    public static void MapQuizEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/quiz").WithTags("Quiz");

        group.MapGet("/generate", async (QuizService quiz)
            => (await quiz.GenerateAsync()).ToHttp());

        group.MapPost("/submit", (SubmitQuizRequest request, QuizService quiz)
            => quiz.Submit(request).ToHttp());
    }
}
