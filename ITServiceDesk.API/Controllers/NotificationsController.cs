using ITServiceDesk.Core.Wrappers;
using ITServiceDesk.Service.DTOs.Notifications;
using ITServiceDesk.Service.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

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

    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id)
    {
        var result = await _service.MarkAsReadAsync(id);
        return Ok(ApiResponse<NotificationResponseDto>.Success(result, "Okundu olarak işaretlendi."));
    }
}
