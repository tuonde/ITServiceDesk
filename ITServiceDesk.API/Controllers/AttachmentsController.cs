using ITServiceDesk.Core.Wrappers;
using ITServiceDesk.Service.DTOs.Attachments;
using ITServiceDesk.Service.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;

namespace ITServiceDesk.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AttachmentsController : ControllerBase
{
    private readonly IAttachmentService _service;
    private readonly ITicketService _ticketService;
    
    public AttachmentsController(IAttachmentService service, ITicketService ticketService)
    {
        _service = service;
        _ticketService = ticketService;
    }

    private async Task<bool> IsUserAuthorizedForTicket(Guid ticketId)
    {
        var isAdmin = User.IsInRole("Admin");
        var isTechnician = User.IsInRole("Technician");
        if (isAdmin || isTechnician) return true;

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(userIdString, out var userId))
        {
            var userRoles = ((ClaimsIdentity)User.Identity).Claims
                .Where(c => c.Type == ClaimTypes.Role)
                .Select(c => c.Value)
                .ToList();
                
            var ticket = await _ticketService.GetByIdAsync(ticketId, userId, userRoles);
            return ticket != null && ticket.RequesterId == userId;
        }
        return false;
    }

    [HttpGet("ticket/{ticketId}")]
    public async Task<IActionResult> GetByTicketId(Guid ticketId)
    {
        if (!await IsUserAuthorizedForTicket(ticketId))
            return Forbid();

        var result = await _service.GetByTicketIdAsync(ticketId);
        return Ok(ApiResponse<IEnumerable<AttachmentResponseDto>>.Success(result));
    }

    [HttpGet("download/{id}")]
    public async Task<IActionResult> Download(Guid id)
    {
        var attachment = await _service.GetByIdAsync(id);
        if (attachment == null) return NotFound();

        // Check if user is authorized to download this file (belongs to their ticket)
        if (attachment.TicketId.HasValue && !await IsUserAuthorizedForTicket(attachment.TicketId.Value))
            return Forbid();

        // If it's a legacy file (starts with "/uploads/"), serve from wwwroot for backward compatibility
        // Wait, the user said we don't need to move old files. So old files have FilePath = "/uploads/..."
        // New files have FilePath = "guid.ext"
        
        string physicalPath;
        if (attachment.FilePath.StartsWith("/uploads/"))
        {
            var webRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            physicalPath = Path.Combine(webRoot, attachment.FilePath.TrimStart('/'));
        }
        else
        {
            var appDataFolder = Path.Combine(Directory.GetCurrentDirectory(), "App_Data", "uploads");
            physicalPath = Path.Combine(appDataFolder, attachment.FilePath);
        }

        if (!System.IO.File.Exists(physicalPath))
            return NotFound("Dosya fiziksel olarak bulunamadı.");

        return PhysicalFile(physicalPath, attachment.ContentType, attachment.FileName);
    }

    [HttpPost]
    [EnableRateLimiting("UploadPolicy")]
    public async Task<IActionResult> Upload([FromForm] AttachmentCreateDto dto)
    {
        if (dto.TicketId.HasValue && !await IsUserAuthorizedForTicket(dto.TicketId.Value))
            return Forbid();

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(userIdString, out var userId))
        {
            dto.UploaderId = userId;
        }

        var result = await _service.UploadAsync(dto);
        return Ok(ApiResponse<AttachmentResponseDto>.Success(result, "Dosya yüklendi."));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        _ = Guid.TryParse(userIdString, out var userId);
        var isAdmin = User.IsInRole("Admin");

        await _service.DeleteAsync(id, userId, isAdmin);
        return Ok(ApiResponse<bool>.Success(true, "Dosya silindi."));
    }
}
