using ITServiceDesk.Core.Entities;

namespace ITServiceDesk.Core.Interfaces.Repositories;

public interface ITicketRepository : IRepository<Ticket>
{
    Task<IEnumerable<Ticket>> GetTicketsWithDetailsAsync();
}
