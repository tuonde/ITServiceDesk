using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Enums;

namespace ITServiceDesk.Core.Interfaces.Repositories;

public interface ITicketRepository : IRepository<Ticket>
{
    Task<IEnumerable<Ticket>> GetTicketsWithDetailsAsync();
    Task<(IEnumerable<Ticket> Tickets, int TotalCount)> GetPagedTicketsAsync(int pageNumber, int pageSize, TicketStatus? status, Priority? priority, Guid? requesterId);
}
