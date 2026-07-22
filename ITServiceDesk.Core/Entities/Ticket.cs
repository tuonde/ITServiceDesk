using ITServiceDesk.Core.Enums;

namespace ITServiceDesk.Core.Entities;

public class Ticket : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    
    public TicketStatus Status { get; set; } = TicketStatus.Open;
    public Priority Priority { get; set; } = Priority.Medium;
    
    public DateTime? ResolvedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    
    // Navigation Properties
    public Guid RequesterId { get; set; }
    public AppUser? Requester { get; set; }
    
    public Guid? AssigneeId { get; set; }
    public AppUser? Assignee { get; set; }
    
    public Guid DepartmentId { get; set; }
    public Department? Department { get; set; }
    
    public ICollection<Comment> Comments { get; set; } = [];
    public ICollection<Attachment> Attachments { get; set; } = [];
    public ICollection<AuditLog> AuditLogs { get; set; } = [];
}
