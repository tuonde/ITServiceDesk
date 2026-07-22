using ITServiceDesk.Core.Wrappers;
using ITServiceDesk.Service.DTOs.Attachments;
using ITServiceDesk.Service.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

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
        return Ok(ApiResponse<IEnumerable<AttachmentResponseDto>>.Success(result));
    }

    [HttpPost]
    public async Task<IActionResult> Upload([FromForm] AttachmentCreateDto dto)
    {
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
