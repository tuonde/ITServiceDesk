using ITServiceDesk.Core.Wrappers;
using ITServiceDesk.Service.DTOs.Attachments;
using ITServiceDesk.Service.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace ITServiceDesk.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AttachmentsController : ControllerBase
{
    private readonly IAttachmentService _service;
    public AttachmentsController(IAttachmentService service) => _service = service;

    [HttpGet("ticket/{ticketId}")]
    public async Task<IActionResult> GetByTicketId(Guid ticketId)
    {
        var result = await _service.GetByTicketIdAsync(ticketId);
        foreach (var att in result)
        {
            Console.WriteLine($"Attachment {att.FileName} has UploaderName: '{att.UploaderName}' and UploaderId: {att.UploaderId}");
        }
        return Ok(ApiResponse<IEnumerable<AttachmentResponseDto>>.Success(result));
    }

    [HttpPost]
    public async Task<IActionResult> Upload([FromForm] AttachmentCreateDto dto)
    {
        var userIdString = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
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
        await _service.DeleteAsync(id);
        return Ok(ApiResponse<bool>.Success(true, "Dosya silindi."));
    }
}
