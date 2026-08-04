using ITServiceDesk.Core.Enums;

namespace ITServiceDesk.Service.DTOs.Devices;

public class DeviceCreateDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DeviceStatus Status { get; set; } = DeviceStatus.Active;
    public Guid CategoryId { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? AssignedUserId { get; set; }
}
