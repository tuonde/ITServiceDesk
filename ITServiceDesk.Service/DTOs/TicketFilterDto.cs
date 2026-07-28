using ITServiceDesk.Core.Enums;

namespace ITServiceDesk.Service.DTOs;

public class TicketFilterDto
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    
    public TicketStatus? Status { get; set; }
    public Priority? Priority { get; set; }
    public Guid? DeviceId { get; set; }
}
