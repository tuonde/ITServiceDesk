using AutoMapper;
using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Interfaces.Repositories;
using ITServiceDesk.Service.DTOs.Notifications;
using ITServiceDesk.Service.Interfaces;

namespace ITServiceDesk.Service.Services;

public class NotificationManager : INotificationService
{
    private readonly IRepository<Notification> _repository;
    private readonly IMapper _mapper;

    public NotificationManager(IRepository<Notification> repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<IEnumerable<NotificationResponseDto>> GetUnreadByUserIdAsync(Guid userId)
    {
        var all = await _repository.GetAllAsync();
        var unread = all.Where(x => x.UserId == userId && !x.IsRead);
        return _mapper.Map<IEnumerable<NotificationResponseDto>>(unread);
    }

    public async Task<NotificationResponseDto> MarkAsReadAsync(Guid id)
    {
        var notification = await _repository.GetByIdAsync(id);
        if (notification == null) throw new Exception("Notification not found");
        
        notification.IsRead = true;
        _repository.Update(notification);
        await _repository.SaveChangesAsync();
        return _mapper.Map<NotificationResponseDto>(notification);
    }
}
