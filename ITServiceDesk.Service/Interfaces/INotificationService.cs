using ITServiceDesk.Service.DTOs.Notifications;

namespace ITServiceDesk.Service.Interfaces;

public interface INotificationService
{
    Task<IEnumerable<NotificationResponseDto>> GetUnreadByUserIdAsync(Guid userId);
    Task<IEnumerable<NotificationResponseDto>> GetAllByUserIdAsync(Guid userId);
    Task<NotificationResponseDto> MarkAsReadAsync(Guid id);
    Task MarkAllAsReadAsync(Guid userId);
    Task<NotificationResponseDto> CreateAndSendNotificationAsync(NotificationCreateDto dto);
    Task NotifyAdminsAsync(string message, Guid? relatedTicketId);
}
