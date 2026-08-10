using ITServiceDesk.Core.Wrappers;
using ITServiceDesk.Service.DTOs.Notifications;
using ITServiceDesk.Service.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
namespace ITServiceDesk.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _service;
    public NotificationsController(INotificationService service) => _service = service;

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUnread(Guid userId)
    {
        var result = await _service.GetUnreadByUserIdAsync(userId);
        return Ok(ApiResponse<IEnumerable<NotificationResponseDto>>.Success(result));
    }

    [HttpGet("user/{userId}/all")]
    public async Task<IActionResult> GetAll(Guid userId)
    {
        var result = await _service.GetAllByUserIdAsync(userId);
        return Ok(ApiResponse<IEnumerable<NotificationResponseDto>>.Success(result));
    }

    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id)
    {
        var result = await _service.MarkAsReadAsync(id);
        return Ok(ApiResponse<NotificationResponseDto>.Success(result, "Okundu olarak işaretlendi."));
    }

    [HttpPut("user/{userId}/read-all")]
    public async Task<IActionResult> MarkAllAsRead(Guid userId)
    {
        await _service.MarkAllAsReadAsync(userId);
        return Ok(ApiResponse<string>.Success("Tümü okundu olarak işaretlendi."));
    }

    [HttpGet("unread")]
    public async Task<IActionResult> GetUnreadNotifications()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
        var result = await _service.GetUnreadByUserIdAsync(userId);
        return Ok(ApiResponse<IEnumerable<NotificationResponseDto>>.Success(result));
    }

    [HttpPut("mark-as-read")]
    public async Task<IActionResult> MarkUnreadAsRead()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
        await _service.MarkAllAsReadAsync(userId);
        return Ok(ApiResponse<string>.Success("Tümü okundu olarak işaretlendi."));
    }
}
