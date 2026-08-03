namespace ITServiceDesk.Service.DTOs.Notifications;

public class NotificationCreateDto
{
    public string Message { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public Guid? RelatedTicketId { get; set; }
}
