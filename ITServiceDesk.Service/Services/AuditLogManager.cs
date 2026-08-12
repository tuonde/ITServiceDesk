using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Interfaces.Repositories;
using ITServiceDesk.Service.DTOs;
using ITServiceDesk.Service.Interfaces;
using ITServiceDesk.Core.Wrappers;
using Microsoft.EntityFrameworkCore;
using ITServiceDesk.Data.Contexts;

namespace ITServiceDesk.Service.Services;

public class AuditLogManager : IAuditLogService
{
    private readonly IRepository<AuditLog> _repository;
    private readonly ITServiceDeskDbContext _context;

    public AuditLogManager(IRepository<AuditLog> repository, ITServiceDeskDbContext context)
    {
        _repository = repository;
        _context = context;
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

    public async Task<PagedResponse<IEnumerable<AuditLogResponseDto>>> GetAllLogsAsync(int pageNumber, int pageSize, DateTime? startDate = null, DateTime? endDate = null, string? action = null)
    {
        var query = _context.AuditLogs
            .Where(x => (x.OldValue == null || !x.OldValue.Contains("PasswordHash")) && 
                        (x.NewValue == null || !x.NewValue.Contains("PasswordHash")));

        if (startDate.HasValue)
        {
            var start = startDate.Value.Date;
            query = query.Where(x => x.CreatedAt >= start);
        }
        if (endDate.HasValue)
        {
            var end = endDate.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(x => x.CreatedAt <= end);
        }
        if (!string.IsNullOrEmpty(action) && action != "All")
        {
            query = query.Where(x => x.Action.Contains(action));
        }

        query = query.OrderByDescending(x => x.CreatedAt);

        var totalCount = await query.CountAsync();
        
        var logs = await query
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var userIds = logs.Where(l => l.UserId.HasValue).Select(l => l.UserId!.Value).Distinct().ToList();
        var users = await _context.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => new { u.FirstName, u.LastName, u.Email });

        var dtos = logs.Select(log => 
        {
            var user = log.UserId.HasValue ? users.GetValueOrDefault(log.UserId.Value) : null;
            return new AuditLogResponseDto
            {
                Id = log.Id,
                UserId = log.UserId ?? Guid.Empty,
                UserName = user != null ? $"{user.FirstName} {user.LastName}" : "Sistem (Otomatik)",
                UserEmail = user != null ? user.Email ?? "" : "",
                TicketId = log.TicketId,
                Action = log.Action,
                OldValue = log.OldValue,
                NewValue = log.NewValue,
                CreatedAt = log.CreatedAt
            };
        });

        return PagedResponse<IEnumerable<AuditLogResponseDto>>.Success(dtos, pageNumber, pageSize, totalCount);
    }
}
