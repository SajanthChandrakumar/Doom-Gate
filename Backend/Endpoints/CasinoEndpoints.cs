using DoomGate.Api.Models;
using DoomGate.Api.Services;

namespace DoomGate.Api.Endpoints;

public static class CasinoEndpoints
{
    public static void MapCasinoEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/casino").WithTags("Casino");

        group.MapGet("/state", (CasinoService casino) => Results.Ok(casino.GetState()));

        group.MapPost("/stake", (StakeRequest request, CasinoService casino)
            => casino.PlaceStake(request).ToHttp());

        group.MapPost("/claim", (CasinoService casino)
            => casino.Claim().ToHttp());

        group.MapPost("/liquidate", (CasinoService casino)
            => casino.Liquidate().ToHttp());
    }
}
