using ITServiceDesk.Core.Enums;

namespace ITServiceDesk.Service.DTOs;

public class TicketSearchDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public TicketStatus Status { get; set; }
    public Priority Priority { get; set; }
    public DateTime CreatedAt { get; set; }
}
