using ITServiceDesk.Core.Enums;

namespace ITServiceDesk.Service.DTOs;

public class TicketResponseDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public TicketStatus Status { get; set; }
    public Priority Priority { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    
    public DateTime? ResponseDueDate { get; set; }
    public DateTime? ResolutionDueDate { get; set; }
    public bool IsEscalated { get; set; }
    
    public Guid RequesterId { get; set; }
    public string? RequesterName { get; set; }
    public Guid? AssigneeId { get; set; }
    public string? AssigneeName { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    
    public Guid? DeviceId { get; set; }
    public string? DeviceName { get; set; }
    public Guid? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public decimal? RepairCost { get; set; }
    
    public string? ResolutionReport { get; set; }
}
