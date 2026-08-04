using ITServiceDesk.Core.Enums;

namespace ITServiceDesk.Core.Entities;

public class Device : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DeviceStatus Status { get; set; } = DeviceStatus.Active;
    public DateTime? WarrantyExpirationDate { get; set; }
    
    
    // Navigation Properties
    public Guid CategoryId { get; set; }
    public DeviceCategory? Category { get; set; }
    
    public Guid? DepartmentId { get; set; }
    public Department? Department { get; set; }
    
    public Guid? AssignedUserId { get; set; }
    public AppUser? AssignedUser { get; set; }
    
    public ICollection<Ticket> Tickets { get; set; } = [];
}
