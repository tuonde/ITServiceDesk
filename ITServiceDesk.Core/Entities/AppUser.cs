using Microsoft.AspNetCore.Identity;

namespace ITServiceDesk.Core.Entities;

public class AppUser : IdentityUser<Guid>
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    
    // Navigation Properties
    public Guid? DepartmentId { get; set; }
    public Department? Department { get; set; }
    
    public ICollection<Ticket> CreatedTickets { get; set; } = [];
    public ICollection<Ticket> AssignedTickets { get; set; } = [];
    public ICollection<Comment> Comments { get; set; } = [];
    public ICollection<AuditLog> AuditLogs { get; set; } = [];
    public ICollection<Notification> Notifications { get; set; } = [];
}
