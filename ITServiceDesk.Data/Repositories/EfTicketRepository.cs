using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Interfaces.Repositories;
using ITServiceDesk.Data.Contexts;
using ITServiceDesk.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace ITServiceDesk.Data.Repositories;

public class EfTicketRepository : EfRepository<Ticket>, ITicketRepository
{
    public EfTicketRepository(ITServiceDeskDbContext context) : base(context)
    {
    }

    public new async Task<Ticket?> GetByIdAsync(Guid id)
    {
        return await _context.Tickets
            .Include(t => t.Requester)
            .Include(t => t.Assignee)
            .Include(t => t.Department)
            .Include(t => t.Device)
            .Include(t => t.Category)
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);
    }

    public async Task<IEnumerable<Ticket>> GetTicketsWithDetailsAsync()
    {
        return await _context.Tickets
            .Include(t => t.Requester)
            .Include(t => t.Assignee)
            .Include(t => t.Department)
            .Include(t => t.Device)
            .Include(t => t.Category)
            .ToListAsync();
    }

    public async Task<(IEnumerable<Ticket> Tickets, int TotalCount)> GetPagedTicketsAsync(int pageNumber, int pageSize, TicketStatus? status, Priority? priority, Guid? exactRequesterId, Guid? involvedUserId, Guid? deviceId, Guid? assigneeId)
    {
        var query = _context.Tickets
            .Include(t => t.Requester)
            .Include(t => t.Assignee)
            .Include(t => t.Department)
            .Include(t => t.Device)
            .Include(t => t.Category)
            .AsQueryable();

        if (status.HasValue)
            query = query.Where(t => t.Status == status.Value);
            
        if (priority.HasValue)
            query = query.Where(t => t.Priority == priority.Value);
            
        if (exactRequesterId.HasValue)
            query = query.Where(t => t.RequesterId == exactRequesterId.Value);

        if (involvedUserId.HasValue)
            query = query.Where(t => t.RequesterId == involvedUserId.Value || t.AssigneeId == involvedUserId.Value);
            
        if (deviceId.HasValue)
            query = query.Where(t => t.DeviceId == deviceId.Value);

        if (assigneeId.HasValue)
            query = query.Where(t => t.AssigneeId == assigneeId.Value);

        var totalCount = await query.CountAsync();

        var tickets = await query
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (tickets, totalCount);
    }
}
