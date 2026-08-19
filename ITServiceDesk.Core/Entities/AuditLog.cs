namespace ITServiceDesk.Core.Entities;

public class AuditLog : BaseEntity
{
    public string Action { get; set; } = string.Empty;
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string? IPAddress { get; set; }
    public string? EntityId { get; set; }
    
    // Navigation Properties
    public Guid? UserId { get; set; }
    public AppUser? User { get; set; }
    
    public Guid? TicketId { get; set; }
    public Ticket? Ticket { get; set; }
}
