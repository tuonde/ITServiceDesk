using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Interfaces.Repositories;
using ITServiceDesk.Data.Contexts;
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
}
