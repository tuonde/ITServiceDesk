using ITServiceDesk.Core.Wrappers;
using ITServiceDesk.Service.DTOs;
using ITServiceDesk.Service.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace ITServiceDesk.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class DepartmentsController : ControllerBase
{
    private readonly IDepartmentService _departmentService;

    public DepartmentsController(IDepartmentService departmentService)
    {
        _departmentService = departmentService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _departmentService.GetAllAsync();
        return Ok(ApiResponse<IEnumerable<DepartmentResponseDto>>.Success(result));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _departmentService.GetByIdAsync(id);
        if (result == null)
            return NotFound(ApiResponse<DepartmentResponseDto>.Fail("Departman bulunamadı."));
            
        return Ok(ApiResponse<DepartmentResponseDto>.Success(result));
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create(DepartmentCreateDto dto)
    {
        var result = await _departmentService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, ApiResponse<DepartmentResponseDto>.Success(result, "Departman oluşturuldu."));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, DepartmentCreateDto dto)
    {
        var result = await _departmentService.UpdateAsync(id, dto);
        return Ok(ApiResponse<DepartmentResponseDto>.Success(result, "Departman güncellendi."));
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await _departmentService.DeleteAsync(id);
        if (!success)
            return NotFound(ApiResponse<bool>.Fail("Departman bulunamadı."));

        return Ok(ApiResponse<bool>.Success(true, "Departman silindi."));
    }
}
