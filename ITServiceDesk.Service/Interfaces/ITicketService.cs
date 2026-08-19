using ITServiceDesk.Core.Wrappers;
using ITServiceDesk.Service.DTOs;

namespace ITServiceDesk.Service.Interfaces;

public interface ITicketService
{
    Task<PagedResponse<IEnumerable<TicketResponseDto>>> GetAllAsync(TicketFilterDto filter, Guid userId, IList<string> userRoles);
    Task<TicketResponseDto?> GetByIdAsync(Guid id, Guid userId, IList<string> userRoles);
    Task<TicketResponseDto> CreateAsync(TicketCreateDto dto);
    Task<TicketResponseDto> UpdateAsync(TicketUpdateDto dto, Guid userId, IList<string> userRoles);
    Task<TicketResponseDto> ReopenAsync(Guid id, TicketReopenDto dto, Guid userId);
    Task<IEnumerable<TicketResponseDto>> GetByDeviceIdAsync(Guid deviceId, Guid userId, IList<string> userRoles);
    Task<IEnumerable<TicketSearchDto>> SearchAsync(string keyword, Guid userId, IList<string> userRoles);
    Task<bool> DeleteAsync(Guid id, Guid userId, IList<string> userRoles);
}
