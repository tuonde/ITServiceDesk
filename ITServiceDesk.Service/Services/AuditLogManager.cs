using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Interfaces.Repositories;
using ITServiceDesk.Service.DTOs;
using ITServiceDesk.Service.Interfaces;

namespace ITServiceDesk.Service.Services;

public class AuditLogManager : IAuditLogService
{
    private readonly IRepository<AuditLog> _repository;

    public AuditLogManager(IRepository<AuditLog> repository)
    {
        _repository = repository;
    }

    public async Task LogAsync(AuditLogDto auditLogDto)
    {
        var log = new AuditLog
        {
            UserId = auditLogDto.UserId,
            TicketId = auditLogDto.TicketId,
            Action = auditLogDto.Action,
            OldValue = auditLogDto.OldValue,
            NewValue = auditLogDto.NewValue,
            IPAddress = auditLogDto.IPAddress
        };
        await _repository.AddAsync(log);
    }
}
