using ITServiceDesk.Service.DTOs;

namespace ITServiceDesk.Service.Interfaces;

public interface ITicketCategoryService
{
    Task<IEnumerable<TicketCategoryDto>> GetAllAsync();
    Task<TicketCategoryDto?> GetByIdAsync(Guid id);
    Task<TicketCategoryDto> CreateAsync(TicketCategoryCreateDto dto);
    Task<TicketCategoryDto> UpdateAsync(TicketCategoryUpdateDto dto);
    Task<bool> DeleteAsync(Guid id);
}
