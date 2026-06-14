using DoomGate.Api.Models;
using DoomGate.Api.Services;

namespace DoomGate.Api.Endpoints;

public static class FocusGuardEndpoints
{
    public static void MapFocusGuardEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/focus").WithTags("Focus Guard");

        // The list of apps/surfaces that count as a breach. The frontend reads this to wire up
        // its own in-browser guard, and it documents what the iOS Shortcut should report.
        group.MapGet("/config", (FocusGuardService guard)
            => Results.Ok(new { blocklist = guard.GetBlocklist() }));

        // The relay endpoint. Called by the browser tab on blur, and by the iOS Screen Time
        // automation when a blocklisted app is opened.
        group.MapPost("/report", (DistractionReport report, FocusGuardService guard)
            => guard.Report(report).ToHttp());
    }
}
