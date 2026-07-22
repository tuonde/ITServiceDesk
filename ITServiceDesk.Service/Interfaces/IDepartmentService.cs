using ITServiceDesk.Service.DTOs;

namespace ITServiceDesk.Service.Interfaces;

public interface IDepartmentService
{
    Task<IEnumerable<DepartmentResponseDto>> GetAllAsync();
    Task<DepartmentResponseDto?> GetByIdAsync(Guid id);
    Task<DepartmentResponseDto> CreateAsync(DepartmentCreateDto dto);
    Task<DepartmentResponseDto> UpdateAsync(Guid id, DepartmentCreateDto dto);
    Task<bool> DeleteAsync(Guid id);
}
