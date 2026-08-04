using ITServiceDesk.Service.DTOs;
using ITServiceDesk.Service.Interfaces;
using ITServiceDesk.Core.Wrappers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITServiceDesk.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class TicketCategoriesController : ControllerBase
{
    private readonly ITicketCategoryService _service;

    public TicketCategoriesController(ITicketCategoryService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _service.GetAllAsync();
        return Ok(ApiResponse<IEnumerable<TicketCategoryDto>>.Success(result));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);
        if (result == null)
            return NotFound(ApiResponse<TicketCategoryDto>.Fail("Kategori bulunamadı."));
        return Ok(ApiResponse<TicketCategoryDto>.Success(result));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create(TicketCategoryCreateDto dto)
    {
        var result = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, ApiResponse<TicketCategoryDto>.Success(result, "Kategori başarıyla oluşturuldu."));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, TicketCategoryUpdateDto dto)
    {
        if (id != dto.Id)
            return BadRequest(ApiResponse<TicketCategoryDto>.Fail("ID uyuşmazlığı."));

        var result = await _service.UpdateAsync(dto);
        return Ok(ApiResponse<TicketCategoryDto>.Success(result, "Kategori başarıyla güncellendi."));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await _service.DeleteAsync(id);
        if (!success)
            return NotFound(ApiResponse<bool>.Fail("Kategori bulunamadı."));
        
        return Ok(ApiResponse<bool>.Success(true, "Kategori başarıyla silindi."));
    }
}
