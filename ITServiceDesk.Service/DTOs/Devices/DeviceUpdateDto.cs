using ITServiceDesk.Core.Enums;

namespace ITServiceDesk.Service.DTOs.Devices;

public class DeviceUpdateDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DeviceStatus Status { get; set; }
    public Guid CategoryId { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? AssignedUserId { get; set; }
}
