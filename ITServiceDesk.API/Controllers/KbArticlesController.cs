using System.Security.Claims;
using ITServiceDesk.Core.Wrappers;
using ITServiceDesk.Service.DTOs.KnowledgeBase;
using ITServiceDesk.Service.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITServiceDesk.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class KbArticlesController : ControllerBase
{
    private readonly IKbArticleService _articleService;

    public KbArticlesController(IKbArticleService articleService)
    {
        _articleService = articleService;
    }

    [HttpGet]
    public async Task<IActionResult> GetPaged([FromQuery] KbArticleFilterDto filter)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        _ = Guid.TryParse(userIdClaim, out var userId);
        var userRoles = User.Claims.Where(c => c.Type == ClaimTypes.Role).Select(c => c.Value).ToList();

        var result = await _articleService.GetPagedAsync(filter, userId, userRoles);
        return Ok(result);
    }

    [HttpGet("stats")]
    [Authorize(Roles = "Admin, Technician")]
    public async Task<IActionResult> GetStats()
    {
        var result = await _articleService.GetDashboardStatsAsync();
        return Ok(ApiResponse<KbDashboardStatsDto>.Success(result));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        _ = Guid.TryParse(userIdClaim, out var userId);
        var userRoles = User.Claims.Where(c => c.Type == ClaimTypes.Role).Select(c => c.Value).ToList();

        var result = await _articleService.GetByIdAsync(id, userId, userRoles);
        if (result == null)
            return NotFound(ApiResponse<KbArticleResponseDto>.Fail("Makale bulunamadı veya erişim yetkiniz yok."));
            
        return Ok(ApiResponse<KbArticleResponseDto>.Success(result));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create(KbArticleCreateDto dto)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        _ = Guid.TryParse(userIdClaim, out var userId);
        
        var result = await _articleService.CreateAsync(dto, userId);
        return Ok(ApiResponse<KbArticleResponseDto>.Success(result));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, KbArticleUpdateDto dto)
    {
        if (id != dto.Id)
            return BadRequest(ApiResponse<KbArticleResponseDto>.Fail("ID uyumsuzluğu."));
            
        var result = await _articleService.UpdateAsync(dto);
        return Ok(ApiResponse<KbArticleResponseDto>.Success(result));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _articleService.DeleteAsync(id);
        if (!result)
            return BadRequest(ApiResponse<bool>.Fail("Silinecek makale bulunamadı."));
            
        return Ok(ApiResponse<bool>.Success(true, "Başarıyla silindi."));
    }

    [HttpPost("{id}/feedback")]
    public async Task<IActionResult> SubmitFeedback(Guid id, [FromBody] KbArticleFeedbackDto dto)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();
            
        var result = await _articleService.SubmitFeedbackAsync(id, userId, dto);
        if (!result)
            return BadRequest(ApiResponse<bool>.Fail("Makale bulunamadı."));
            
        return Ok(ApiResponse<bool>.Success(true, "Geri bildiriminiz kaydedildi."));
    }
}
