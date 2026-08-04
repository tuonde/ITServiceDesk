namespace ITServiceDesk.Core.Entities;

public class TicketCategory : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    
    // Navigation Properties
    public ICollection<Ticket> Tickets { get; set; } = [];
}
