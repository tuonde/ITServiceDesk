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
    private readonly IUserContextService _userContext;
    
    public CommentsController(ICommentService service, IUserContextService userContext)
    {
        _service = service;
        _userContext = userContext;
    }

    [HttpGet("ticket/{ticketId}")]
    public async Task<IActionResult> GetByTicketId(Guid ticketId)
    {
        var result = await _service.GetAllByTicketIdAsync(ticketId, _userContext.UserId ?? Guid.Empty, _userContext.UserRoles);
        return Ok(ApiResponse<IEnumerable<CommentResponseDto>>.Success(result));
    }

    [HttpPost]
    public async Task<IActionResult> Create(CommentCreateDto dto)
    {
        if (_userContext.UserId.HasValue)
        {
            dto.UserId = _userContext.UserId.Value;
        }
        else
        {
            return Unauthorized(ApiResponse<CommentResponseDto>.Fail("Kullanıcı kimliği alınamadı."));
        }

        var result = await _service.CreateAsync(dto, _userContext.UserId ?? Guid.Empty, _userContext.UserRoles);
        return Ok(ApiResponse<CommentResponseDto>.Success(result, "Yorum oluşturuldu."));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, CommentUpdateDto dto)
    {
        var isAdmin = _userContext.UserRoles.Contains("Admin");
        var result = await _service.UpdateAsync(id, dto, _userContext.UserId ?? Guid.Empty, isAdmin);
        return Ok(ApiResponse<CommentResponseDto>.Success(result, "Yorum güncellendi."));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var isAdmin = _userContext.UserRoles.Contains("Admin");
        await _service.DeleteAsync(id, _userContext.UserId ?? Guid.Empty, isAdmin);
        return Ok(ApiResponse<bool>.Success(true, "Yorum silindi."));
    }
}
