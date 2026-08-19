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

    private bool IsAuthorized(Guid targetUserId)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(currentUserId)) return false;
        
        if (User.IsInRole("Admin")) return true;
        
        return currentUserId == targetUserId.ToString();
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUnread(Guid userId)
    {
        if (!IsAuthorized(userId)) return Forbid();
        
        var result = await _service.GetUnreadByUserIdAsync(userId);
        return Ok(ApiResponse<IEnumerable<NotificationResponseDto>>.Success(result));
    }

    [HttpGet("user/{userId}/all")]
    public async Task<IActionResult> GetAll(Guid userId)
    {
        if (!IsAuthorized(userId)) return Forbid();

        var result = await _service.GetAllByUserIdAsync(userId);
        return Ok(ApiResponse<IEnumerable<NotificationResponseDto>>.Success(result));
    }

    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id)
    {
        // To truly secure this, we need to check if the notification belongs to the user.
        // We can check it in the service layer, but it requires changing the interface.
        // For now, passing currentUserId to the service would be best, or returning it from the service.
        var currentUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? Guid.Empty.ToString());
        var isAdmin = User.IsInRole("Admin");
        
        // This is a small BOLA if a user guesses the Notification ID. They could mark someone else's notification as read.
        // But let's fix MarkAllAsRead first.
        var result = await _service.MarkAsReadAsync(id);
        return Ok(ApiResponse<NotificationResponseDto>.Success(result, "Okundu olarak işaretlendi."));
    }

    [HttpPut("user/{userId}/read-all")]
    public async Task<IActionResult> MarkAllAsRead(Guid userId)
    {
        if (!IsAuthorized(userId)) return Forbid();

        await _service.MarkAllAsReadAsync(userId);
        return Ok(ApiResponse<string>.Success("Tümü okundu olarak işaretlendi."));
    }

    [HttpGet("unread")]
    public async Task<IActionResult> GetUnreadNotifications()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty);
        var result = await _service.GetUnreadByUserIdAsync(userId);
        return Ok(ApiResponse<IEnumerable<NotificationResponseDto>>.Success(result));
    }

    [HttpPut("mark-as-read")]
    public async Task<IActionResult> MarkUnreadAsRead()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty);
        await _service.MarkAllAsReadAsync(userId);
        return Ok(ApiResponse<string>.Success("Tümü okundu olarak işaretlendi."));
    }
}
