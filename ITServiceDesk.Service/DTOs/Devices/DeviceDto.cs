using ITServiceDesk.Core.Enums;

namespace ITServiceDesk.Service.DTOs.Devices;

public class DeviceDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DeviceStatus Status { get; set; }
    
    public Guid CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    
    public Guid? AssignedUserId { get; set; }
    public string? AssignedUserName { get; set; }
}
