namespace ITServiceDesk.Service.DTOs;

public class AuditLogDto
{
    public Guid UserId { get; set; }
    public Guid? TicketId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? IPAddress { get; set; }
}
