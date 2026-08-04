using ITServiceDesk.Core.Wrappers;
using ITServiceDesk.Service.DTOs.Comments;
using ITServiceDesk.Service.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace ITServiceDesk.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class CommentsController : ControllerBase
{
    private readonly ICommentService _service;
    public CommentsController(ICommentService service) => _service = service;

    [HttpGet("ticket/{ticketId}")]
    public async Task<IActionResult> GetByTicketId(Guid ticketId)
    {
        bool isInternalViewer = User.IsInRole("Admin") || User.IsInRole("Technician");
        var result = await _service.GetAllByTicketIdAsync(ticketId, isInternalViewer);
        return Ok(ApiResponse<IEnumerable<CommentResponseDto>>.Success(result));
    }

    [HttpPost]
    public async Task<IActionResult> Create(CommentCreateDto dto)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(userIdString, out Guid userId))
        {
            dto.UserId = userId;
        }
        else
        {
            return Unauthorized(ApiResponse<CommentResponseDto>.Fail("Kullanıcı kimliği alınamadı."));
        }

        var result = await _service.CreateAsync(dto);
        return Ok(ApiResponse<CommentResponseDto>.Success(result, "Yorum oluşturuldu."));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, CommentUpdateDto dto)
    {
        var result = await _service.UpdateAsync(id, dto);
        return Ok(ApiResponse<CommentResponseDto>.Success(result, "Yorum güncellendi."));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return Ok(ApiResponse<bool>.Success(true, "Yorum silindi."));
    }
}
