using Microsoft.AspNetCore.Mvc;
using DoomGate.Api.Models;
using DoomGate.Api.Services;

namespace DoomGate.Api.Controllers;

[ApiController]
public class StateController : ControllerBase
{
    private readonly IGameStateService _gameStateService;

    public StateController(IGameStateService gameStateService)
    {
        _gameStateService = gameStateService;
    }

    [HttpGet("api/state")]
    public IActionResult GetState()
    {
        return Ok(_gameStateService.GetState());
    }

    [HttpPost("api/shop/unlock")]
    public IActionResult UnlockNode([FromBody] UnlockRequest request)
    {
        if (string.IsNullOrEmpty(request.NodeId) || request.Cost < 0)
        {
            return BadRequest(new { error = "Missing nodeId or invalid cost" });
        }

        var success = _gameStateService.UnlockNode(request.NodeId, request.Cost);

        if (success)
        {
            var remaining = _gameStateService.GetState().FocusTokens;
            return Ok(new { success = true, remainingTokens = remaining });
        }
        else
        {
            return BadRequest(new { error = "Not enough focus tokens or already unlocked" });
        }
    }
}
