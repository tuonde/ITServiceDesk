using ITServiceDesk.Core.Enums;

namespace ITServiceDesk.Service.DTOs;

public class TicketUpdateDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public TicketStatus Status { get; set; }
    public Priority Priority { get; set; }
    public Guid? AssigneeId { get; set; }
    public Guid DepartmentId { get; set; }
}
