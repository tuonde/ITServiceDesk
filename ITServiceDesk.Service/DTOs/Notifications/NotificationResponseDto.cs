namespace ITServiceDesk.Service.DTOs.Notifications;

public class NotificationResponseDto
{
    public Guid Id { get; set; }
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public Guid UserId { get; set; }
    public Guid? RelatedTicketId { get; set; }
    public DateTime CreatedAt { get; set; }
}
