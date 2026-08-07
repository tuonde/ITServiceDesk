using AutoMapper;
using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Interfaces.Repositories;
using ITServiceDesk.Service.DTOs.Comments;
using ITServiceDesk.Service.Interfaces;
using Microsoft.AspNetCore.SignalR;
using ITServiceDesk.Service.Hubs;
using Microsoft.EntityFrameworkCore;

namespace ITServiceDesk.Service.Services;

public class CommentManager : ICommentService
{
    private readonly IRepository<Comment> _repository;
    private readonly IRepository<Ticket> _ticketRepository;
    private readonly IMapper _mapper;
    private readonly IHubContext<TicketHub> _hubContext;
    private readonly INotificationService _notificationService;

    public CommentManager(IRepository<Comment> repository, IRepository<Ticket> ticketRepository, IMapper mapper, IHubContext<TicketHub> hubContext, INotificationService notificationService)
    {
        _repository = repository;
        _ticketRepository = ticketRepository;
        _mapper = mapper;
        _hubContext = hubContext;
        _notificationService = notificationService;
    }

    public async Task<IEnumerable<CommentResponseDto>> GetAllByTicketIdAsync(Guid ticketId, bool isInternalViewer, Guid currentUserId)
    {
        var query = _repository.Query()
            .Include(c => c.User)
            .Where(x => x.TicketId == ticketId);
            
        if (!isInternalViewer)
        {
            var ticket = await _ticketRepository.GetByIdAsync(ticketId);
            if (ticket != null && ticket.AssigneeId == currentUserId)
            {
                isInternalViewer = true;
            }
        }

        if (!isInternalViewer)
        {
            query = query.Where(x => !x.IsInternal);
        }
            
        var comments = await query.OrderBy(x => x.CreatedAt).ToListAsync();
        return _mapper.Map<IEnumerable<CommentResponseDto>>(comments);
    }

    public async Task<CommentResponseDto> CreateAsync(CommentCreateDto dto)
    {
        var comment = _mapper.Map<Comment>(dto);
        await _repository.AddAsync(comment);
        await _repository.SaveChangesAsync();

        // SignalR Notification
        var ticket = await _ticketRepository.GetByIdAsync(comment.TicketId);
        string message = ticket != null ? $"\"{ticket.Title}\" bileti için yeni bir yorum yapıldı!" : $"Bilet için yeni bir yorum yapıldı!";
        await _hubContext.Clients.All.SendAsync("ReceiveCommentNotification", comment.TicketId, message);

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

    public async Task<CommentResponseDto> UpdateAsync(Guid id, CommentUpdateDto dto)
    {
        var comment = await _repository.GetByIdAsync(id);
        if (comment == null) throw new Exception("Yorum bulunamadı");
        
        _mapper.Map(dto, comment);
        _repository.Update(comment);
        await _repository.SaveChangesAsync();
        return _mapper.Map<CommentResponseDto>(comment);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var comment = await _repository.GetByIdAsync(id);
        if (comment == null) return false;
        
        _repository.Remove(comment);
        await _repository.SaveChangesAsync();
        return true;
    }
}
