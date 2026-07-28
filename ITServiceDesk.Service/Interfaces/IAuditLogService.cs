using ITServiceDesk.Service.DTOs;

namespace ITServiceDesk.Service.Interfaces;

public interface IAuditLogService
{
    Task LogAsync(AuditLogDto auditLogDto);
    Task<ITServiceDesk.Core.Wrappers.PagedResponse<IEnumerable<AuditLogResponseDto>>> GetAllLogsAsync(int pageNumber, int pageSize, DateTime? startDate = null, DateTime? endDate = null, string action = null);
}
