using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Interfaces.Repositories;
using ITServiceDesk.Data.Contexts;

namespace ITServiceDesk.Data.Repositories;

public class EfTicketCategoryRepository : EfRepository<TicketCategory>, ITicketCategoryRepository
{
    public EfTicketCategoryRepository(ITServiceDeskDbContext context) : base(context)
    {
    }
}
