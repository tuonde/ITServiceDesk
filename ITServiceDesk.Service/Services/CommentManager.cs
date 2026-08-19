using AutoMapper;
using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Interfaces.Repositories;
using ITServiceDesk.Service.DTOs.Comments;
using ITServiceDesk.Service.Interfaces;
using Microsoft.AspNetCore.SignalR;
using ITServiceDesk.Service.Hubs;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using ITServiceDesk.Core.Constants;

namespace ITServiceDesk.Service.Services;

public class CommentManager : ICommentService
{
    private readonly IRepository<Comment> _repository;
    private readonly IRepository<Ticket> _ticketRepository;
    private readonly IMapper _mapper;
    private readonly IHubContext<TicketHub> _hubContext;
    private readonly INotificationService _notificationService;
    private readonly UserManager<AppUser> _userManager;

    public CommentManager(IRepository<Comment> repository, IRepository<Ticket> ticketRepository, IMapper mapper, IHubContext<TicketHub> hubContext, INotificationService notificationService, UserManager<AppUser> userManager)
    {
        _repository = repository;
        _ticketRepository = ticketRepository;
        _mapper = mapper;
        _hubContext = hubContext;
        _notificationService = notificationService;
        _userManager = userManager;
    }

    public async Task<IEnumerable<CommentResponseDto>> GetAllByTicketIdAsync(Guid ticketId, Guid currentUserId, IList<string> userRoles)
    {
        var ticket = await _ticketRepository.GetByIdAsync(ticketId);
        if (ticket == null) throw new AppException("Ticket bulunamadı.");

        var isAdmin = userRoles.Contains(RoleConstants.Admin);
        var isTechnician = userRoles.Contains(RoleConstants.Technician);

        if (!isAdmin && !isTechnician && ticket.RequesterId != currentUserId)
        {
            throw new UnauthorizedAccessException("Bu biletin yorumlarını görme yetkiniz yok.");
        }

        var query = _repository.Query()
            .Include(c => c.User)
            .Where(x => x.TicketId == ticketId);
            
        bool isInternalViewer = isAdmin || (isTechnician && ticket.AssigneeId == currentUserId);

        if (!isInternalViewer)
        {
            query = query.Where(x => !x.IsInternal);
        }
            
        var comments = await query.OrderBy(x => x.CreatedAt).AsNoTracking().ToListAsync();
        return _mapper.Map<IEnumerable<CommentResponseDto>>(comments);
    }

    public async Task<CommentResponseDto> CreateAsync(CommentCreateDto dto, Guid currentUserId, IList<string> userRoles)
    {
        var ticket = await _ticketRepository.GetByIdAsync(dto.TicketId);
        if (ticket == null) throw new AppException("Ticket bulunamadı.");

        var isAdmin = userRoles.Contains(RoleConstants.Admin);
        var isTechnician = userRoles.Contains(RoleConstants.Technician);

        if (!isAdmin && !isTechnician && ticket.RequesterId != currentUserId)
        {
            throw new UnauthorizedAccessException("Bu bilete yorum yapma yetkiniz yok.");
        }

        var comment = _mapper.Map<Comment>(dto);
        await _repository.AddAsync(comment);
        await _repository.SaveChangesAsync();

        // SignalR Notification
        string message = $"\"{ticket.Title}\" bileti için yeni bir yorum yapıldı!";
        
        var adminUsers = await _userManager.GetUsersInRoleAsync(RoleConstants.Admin);
        var notifyUserIds = adminUsers.Select(u => u.Id.ToString()).ToList();
        
        if (ticket.RequesterId != Guid.Empty && !notifyUserIds.Contains(ticket.RequesterId.ToString()))
            notifyUserIds.Add(ticket.RequesterId.ToString());
            
        if (ticket.AssigneeId.HasValue && ticket.AssigneeId.Value != Guid.Empty && !notifyUserIds.Contains(ticket.AssigneeId.Value.ToString()))
            notifyUserIds.Add(ticket.AssigneeId.Value.ToString());

        await _hubContext.Clients.Users(notifyUserIds).SendAsync("ReceiveCommentNotification", new { ticketId = comment.TicketId, message = message });

        if (ticket != null)
        {
            if (comment.UserId == ticket.RequesterId)
            {
                // Requester commented, notify ALL Admins
                await _notificationService.NotifyAdminsAsync(message, ticket.Id);
            }
            else
            {
                // Admin commented, notify Requester
                if (ticket.RequesterId != Guid.Empty)
                {
                    await _notificationService.CreateAndSendNotificationAsync(new DTOs.Notifications.NotificationCreateDto
                    {
                        Message = message,
                        UserId = ticket.RequesterId,
                        RelatedTicketId = ticket.Id
                    });
                }
            }
        }

        var createdComment = await _repository.Query()
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Id == comment.Id);

        return _mapper.Map<CommentResponseDto>(createdComment ?? comment);
    }

    public async Task<CommentResponseDto> UpdateAsync(Guid id, CommentUpdateDto dto, Guid userId, bool isAdmin)
    {
        var comment = await _repository.GetByIdAsync(id);
        if (comment == null) throw new AppException("Yorum bulunamadı");
        
        if (!isAdmin && comment.UserId != userId)
            throw new UnauthorizedAccessException("Bu yorumu güncelleme yetkiniz yok.");
            
        _mapper.Map(dto, comment);
        _repository.Update(comment);
        await _repository.SaveChangesAsync();
        return _mapper.Map<CommentResponseDto>(comment);
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId, bool isAdmin)
    {
        var comment = await _repository.GetByIdAsync(id);
        if (comment == null) return false;
        
        if (!isAdmin && comment.UserId != userId)
            throw new UnauthorizedAccessException("Bu yorumu silme yetkiniz yok.");
            
        _repository.Remove(comment);
        await _repository.SaveChangesAsync();
        return true;
    }
}
