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

    public async Task<IEnumerable<Ticket>> GetTicketsWithDetailsAsync()
    {
        return await _context.Tickets
            .Include(t => t.Requester)
            .Include(t => t.Assignee)
            .Include(t => t.Department)
            .ToListAsync();
    }

    public async Task<(IEnumerable<Ticket> Tickets, int TotalCount)> GetPagedTicketsAsync(int pageNumber, int pageSize, TicketStatus? status, Priority? priority, Guid? requesterId)
    {
        var query = _context.Tickets
            .Include(t => t.Requester)
            .Include(t => t.Assignee)
            .Include(t => t.Department)
            .AsQueryable();

        if (status.HasValue)
            query = query.Where(t => t.Status == status.Value);
            
        if (priority.HasValue)
            query = query.Where(t => t.Priority == priority.Value);
            
        if (requesterId.HasValue)
            query = query.Where(t => t.RequesterId == requesterId.Value);

        var totalCount = await query.CountAsync();

        var tickets = await query
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (tickets, totalCount);
    }
}
