using ITServiceDesk.Core.Wrappers;
using ITServiceDesk.Service.DTOs.KnowledgeBase;
using ITServiceDesk.Service.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITServiceDesk.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class KbCategoriesController : ControllerBase
{
    private readonly IKbCategoryService _categoryService;

    public KbCategoriesController(IKbCategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _categoryService.GetAllAsync();
        return Ok(ApiResponse<IEnumerable<KbCategoryResponseDto>>.Success(result));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _categoryService.GetByIdAsync(id);
        if (result == null)
            return NotFound(ApiResponse<KbCategoryResponseDto>.Fail("Kategori bulunamadı."));
            
        return Ok(ApiResponse<KbCategoryResponseDto>.Success(result));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create(KbCategoryCreateDto dto)
    {
        var result = await _categoryService.CreateAsync(dto);
        return Ok(ApiResponse<KbCategoryResponseDto>.Success(result));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, KbCategoryUpdateDto dto)
    {
        if (id != dto.Id)
            return BadRequest(ApiResponse<KbCategoryResponseDto>.Fail("ID uyumsuzluğu."));
            
        var result = await _categoryService.UpdateAsync(dto);
        return Ok(ApiResponse<KbCategoryResponseDto>.Success(result));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _categoryService.DeleteAsync(id);
        if (!result)
            return BadRequest(ApiResponse<bool>.Fail("Silinecek kategori bulunamadı."));
            
        return Ok(ApiResponse<bool>.Success(true, "Başarıyla silindi."));
    }
}
