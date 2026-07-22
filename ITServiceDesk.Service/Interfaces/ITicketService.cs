using ITServiceDesk.Core.Wrappers;
using ITServiceDesk.Service.DTOs;

namespace ITServiceDesk.Service.Interfaces;

public interface ITicketService
{
    Task<PagedResponse<IEnumerable<TicketResponseDto>>> GetAllAsync(TicketFilterDto filter, Guid userId, bool isAdmin);
    Task<TicketResponseDto?> GetByIdAsync(Guid id);
    Task<TicketResponseDto> CreateAsync(TicketCreateDto dto);
    Task<TicketResponseDto> UpdateAsync(TicketUpdateDto dto);
    Task<bool> DeleteAsync(Guid id);
}
