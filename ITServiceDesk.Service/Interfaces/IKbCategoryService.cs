using ITServiceDesk.Core.Wrappers;
using ITServiceDesk.Service.DTOs.KnowledgeBase;

namespace ITServiceDesk.Service.Interfaces;

public interface IKbCategoryService
{
    Task<IEnumerable<KbCategoryResponseDto>> GetAllAsync();
    Task<KbCategoryResponseDto?> GetByIdAsync(Guid id);
    Task<KbCategoryResponseDto> CreateAsync(KbCategoryCreateDto dto);
    Task<KbCategoryResponseDto> UpdateAsync(KbCategoryUpdateDto dto);
    Task<bool> DeleteAsync(Guid id);
}
