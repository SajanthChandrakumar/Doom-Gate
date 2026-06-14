using DoomGate.Api.Models;

namespace DoomGate.Api.Endpoints;

/// <summary>Shared glue for the endpoint layer.</summary>
public static class EndpointExtensions
{
    /// <summary>Translate a domain <see cref="ServiceResult"/> into an HTTP response.</summary>
    public static IResult ToHttp(this ServiceResult result)
        => result.Ok
            ? Results.Ok(result.Data)
            : Results.BadRequest(new { error = result.Error });

    /// <summary>Register every Doom-Gate endpoint group in one call.</summary>
    public static void MapDoomGateEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapCasinoEndpoints();
        app.MapQuizEndpoints();
        app.MapFocusGuardEndpoints();
        app.MapPlayerEndpoints();
    }
}
