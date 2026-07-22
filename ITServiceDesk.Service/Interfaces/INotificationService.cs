using ITServiceDesk.Service.DTOs.Notifications;

namespace ITServiceDesk.Service.Interfaces;

public interface INotificationService
{
    Task<IEnumerable<NotificationResponseDto>> GetUnreadByUserIdAsync(Guid userId);
    Task<NotificationResponseDto> MarkAsReadAsync(Guid id);
}
