namespace ITServiceDesk.Core.Entities;

public class DeviceCategory : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    
    // Navigation Properties
    public ICollection<Device> Devices { get; set; } = [];
}
