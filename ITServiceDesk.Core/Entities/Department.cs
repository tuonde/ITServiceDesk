namespace ITServiceDesk.Core.Entities;

public class Department : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    
    // Navigation Properties
    public ICollection<AppUser> Users { get; set; } = [];
    public ICollection<Ticket> Tickets { get; set; } = [];
}
