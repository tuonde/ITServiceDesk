namespace ITServiceDesk.Core.Entities;

public class Notification : BaseEntity
{
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; } = false;
    
    // Navigation Properties
    public Guid UserId { get; set; }
    public AppUser? User { get; set; }
    
    public Guid? RelatedTicketId { get; set; }
    public Ticket? RelatedTicket { get; set; }
}
