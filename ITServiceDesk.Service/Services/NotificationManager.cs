using AutoMapper;
using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Interfaces.Repositories;
using ITServiceDesk.Service.DTOs.Notifications;
using ITServiceDesk.Service.Interfaces;
using ITServiceDesk.Service.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Identity;

namespace ITServiceDesk.Service.Services;

public class NotificationManager : INotificationService
{
    private readonly IRepository<Notification> _repository;
    private readonly IMapper _mapper;
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly UserManager<AppUser> _userManager;

    public NotificationManager(IRepository<Notification> repository, IMapper mapper, IHubContext<NotificationHub> hubContext, UserManager<AppUser> userManager)
    {
        _repository = repository;
        _mapper = mapper;
        _hubContext = hubContext;
        _userManager = userManager;
    }

    public async Task<IEnumerable<NotificationResponseDto>> GetUnreadByUserIdAsync(Guid userId)
    {
        var all = await _repository.GetAllAsync();
        var unread = all.Where(x => x.UserId == userId && !x.IsRead).OrderByDescending(x => x.CreatedAt);
        return _mapper.Map<IEnumerable<NotificationResponseDto>>(unread);
    }

    public async Task<IEnumerable<NotificationResponseDto>> GetAllByUserIdAsync(Guid userId)
    {
        var all = await _repository.GetAllAsync();
        var userNotifs = all.Where(x => x.UserId == userId).OrderByDescending(x => x.CreatedAt);
        return _mapper.Map<IEnumerable<NotificationResponseDto>>(userNotifs);
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

    public async Task MarkAllAsReadAsync(Guid userId)
    {
        var all = await _repository.GetAllAsync();
        var unread = all.Where(x => x.UserId == userId && !x.IsRead).ToList();
        
        foreach (var item in unread)
        {
            item.IsRead = true;
            _repository.Update(item);
        }
        
        if (unread.Any())
        {
            await _repository.SaveChangesAsync();
        }
    }

    public async Task<NotificationResponseDto> CreateAndSendNotificationAsync(NotificationCreateDto dto)
    {
        var notification = new Notification
        {
            Message = dto.Message,
            UserId = dto.UserId,
            RelatedTicketId = dto.RelatedTicketId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddAsync(notification);
        await _repository.SaveChangesAsync();

        var responseDto = _mapper.Map<NotificationResponseDto>(notification);

        // Send via SignalR
        await _hubContext.Clients.User(dto.UserId.ToString()).SendAsync("ReceiveNotification", responseDto);

        return responseDto;
    }

    public async Task NotifyAdminsAsync(string message, Guid? relatedTicketId)
    {
        var admins = await _userManager.GetUsersInRoleAsync("Admin");
        foreach (var admin in admins)
        {
            await CreateAndSendNotificationAsync(new NotificationCreateDto
            {
                Message = message,
                UserId = admin.Id,
                RelatedTicketId = relatedTicketId
            });
        }
    }
}
