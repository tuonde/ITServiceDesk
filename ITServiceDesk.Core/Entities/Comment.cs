namespace ITServiceDesk.Core.Entities;

public class Comment : BaseEntity
{
    public string Content { get; set; } = string.Empty;
    public bool IsInternal { get; set; } = false;
    
    
    // Navigation Properties
    public Guid TicketId { get; set; }
    public Ticket? Ticket { get; set; }
    
    public Guid UserId { get; set; }
    public AppUser? User { get; set; }
    
    public ICollection<Attachment> Attachments { get; set; } = [];
}
