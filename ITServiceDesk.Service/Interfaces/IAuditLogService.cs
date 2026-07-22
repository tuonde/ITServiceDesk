using ITServiceDesk.Service.DTOs;

namespace ITServiceDesk.Service.Interfaces;

public interface IAuditLogService
{
    Task LogAsync(AuditLogDto auditLogDto);
}
