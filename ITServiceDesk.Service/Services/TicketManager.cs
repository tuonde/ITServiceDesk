using AutoMapper;
using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Interfaces.Repositories;
using ITServiceDesk.Core.Wrappers;
using ITServiceDesk.Service.DTOs;
using ITServiceDesk.Service.Interfaces;
using Microsoft.Extensions.Logging;
using ITServiceDesk.Core.Enums;
using Microsoft.AspNetCore.SignalR;
using ITServiceDesk.Service.Hubs;

namespace ITServiceDesk.Service.Services;

public class TicketManager : ITicketService
{
    private readonly ITicketRepository _ticketRepository;
    private readonly IMapper _mapper;
    private readonly ILogger<TicketManager> _logger;
    private readonly IHubContext<TicketHub> _hubContext;
    private readonly INotificationService _notificationService;
    private readonly IRepository<Device> _deviceRepository;

    public TicketManager(
        ITicketRepository ticketRepository, 
        IMapper mapper, 
        ILogger<TicketManager> logger,
        IHubContext<TicketHub> hubContext,
        INotificationService notificationService,
        IRepository<Device> deviceRepository)
    {
        _ticketRepository = ticketRepository;
        _mapper = mapper;
        _logger = logger;
        _hubContext = hubContext;
        _notificationService = notificationService;
        _deviceRepository = deviceRepository;
    }

    public async Task<PagedResponse<IEnumerable<TicketResponseDto>>> GetAllAsync(TicketFilterDto filter, Guid userId, IList<string> userRoles)
    {
        var isAdmin = userRoles.Contains("Admin");
        var isTechnician = userRoles.Contains("Technician");

        Guid? exactRequesterId = null;
        Guid? involvedUserId = null;

        if (!isAdmin)
        {
            if (isTechnician)
            {
                if (filter.RequesterId.HasValue)
                {
                    exactRequesterId = filter.RequesterId;
                    involvedUserId = null;
                }
                else if (filter.AssigneeId.HasValue)
                {
                    involvedUserId = null;
                }
                else 
                {
                    involvedUserId = userId; // Technician sees where they are Requester or Assignee
                }
            }
            else
                exactRequesterId = userId; // Normal user sees only where they are Requester
        }
        else 
        {
            if (filter.RequesterId.HasValue) exactRequesterId = filter.RequesterId;
        }

        var (tickets, totalCount) = await _ticketRepository.GetPagedTicketsAsync(
            filter.PageNumber, 
            filter.PageSize, 
            filter.Status, 
            filter.Priority, 
            exactRequesterId,
            involvedUserId,
            filter.DeviceId,
            filter.AssigneeId);

        var dtos = _mapper.Map<IEnumerable<TicketResponseDto>>(tickets);
        
        return PagedResponse<IEnumerable<TicketResponseDto>>.Success(
            dtos, 
            filter.PageNumber, 
            filter.PageSize, 
            totalCount);
    }

    public async Task<TicketResponseDto?> GetByIdAsync(Guid id)
    {
        var ticket = await _ticketRepository.GetByIdAsync(id);
        return ticket == null ? null : _mapper.Map<TicketResponseDto>(ticket);
    }

    public async Task<TicketResponseDto> CreateAsync(TicketCreateDto dto)
    {
        _logger.LogInformation("Ticket oluşturma süreci başladı. Başlık: {Title}", dto.Title);
        
        var ticket = _mapper.Map<Ticket>(dto);
        
        // SLA Ataması
        var now = DateTime.UtcNow;
        switch (ticket.Priority)
        {
            case Priority.Critical:
                ticket.ResponseDueDate = now.AddHours(1);
                ticket.ResolutionDueDate = now.AddHours(4);
                break;
            case Priority.High:
                ticket.ResponseDueDate = now.AddHours(4);
                ticket.ResolutionDueDate = now.AddHours(8);
                break;
            case Priority.Medium:
                ticket.ResponseDueDate = now.AddHours(8);
                ticket.ResolutionDueDate = now.AddHours(24);
                break;
            case Priority.Low:
                ticket.ResponseDueDate = now.AddHours(24);
                ticket.ResolutionDueDate = now.AddHours(48);
                break;
            default:
                ticket.ResponseDueDate = now.AddHours(24);
                ticket.ResolutionDueDate = now.AddHours(48);
                break;
        }

        await _ticketRepository.AddAsync(ticket);
        await _ticketRepository.SaveChangesAsync();

        var responseDto = _mapper.Map<TicketResponseDto>(ticket);
        
        // SignalR üzerinden canlı bildirim (herkese gönderilir, client kimin görmesi gerektiğine karar verir)
        await _hubContext.Clients.All.SendAsync("TicketCreated", responseDto);

        // Veritabanı ve NotificationHub üzerinden Adminlere bildirim
        await _notificationService.NotifyAdminsAsync($"Yeni bir talep oluşturuldu: {ticket.Title}", ticket.Id);

        if (ticket.DeviceId.HasValue)
        {
            var device = await _deviceRepository.GetByIdAsync(ticket.DeviceId.Value);
            if (device != null)
            {
                device.Status = DeviceStatus.Faulty;
                _deviceRepository.Update(device);
                await _deviceRepository.SaveChangesAsync();
            }
        }

        return responseDto;
    }

    public async Task<TicketResponseDto> UpdateAsync(TicketUpdateDto dto)
    {
        var existingTicket = await _ticketRepository.GetByIdAsync(dto.Id);
        if (existingTicket == null)
            throw new Exception("Ticket bulunamadı.");

        var oldAssignee = existingTicket.AssigneeId;
        var oldStatus = existingTicket.Status;

        _mapper.Map(dto, existingTicket);
        
        if (dto.Status == TicketStatus.Resolved || dto.Status == TicketStatus.Closed)
        {
            if (existingTicket.ResolvedAt == null)
                existingTicket.ResolvedAt = DateTime.UtcNow;
        }

        // Notification for Status Change
        if (oldStatus != existingTicket.Status && existingTicket.RequesterId != Guid.Empty)
        {
            string statusMessage = existingTicket.Status switch
            {
                TicketStatus.Resolved => $"Talebiniz çözüldü: {existingTicket.Title}",
                TicketStatus.Closed => $"Talebiniz kapatıldı: {existingTicket.Title}",
                TicketStatus.InProgress => $"Talebiniz işleme alındı: {existingTicket.Title}",
                TicketStatus.WaitingForUser => $"Talebiniz için işlem bekleniyor: {existingTicket.Title}",
                _ => $"Talebinizin durumu güncellendi: {existingTicket.Title}"
            };

            await _notificationService.CreateAndSendNotificationAsync(new DTOs.Notifications.NotificationCreateDto
            {
                Message = statusMessage,
                UserId = existingTicket.RequesterId,
                RelatedTicketId = existingTicket.Id
            });
        }

        // Notification for Assignee Change
        if (oldAssignee != existingTicket.AssigneeId && existingTicket.AssigneeId.HasValue && existingTicket.AssigneeId.Value != Guid.Empty)
        {
            await _notificationService.CreateAndSendNotificationAsync(new DTOs.Notifications.NotificationCreateDto
            {
                Message = $"Size yeni bir bilet atandı: {existingTicket.Title}",
                UserId = existingTicket.AssigneeId.Value,
                RelatedTicketId = existingTicket.Id
            });
        }

        _ticketRepository.Update(existingTicket);
        await _ticketRepository.SaveChangesAsync();

        if (existingTicket.DeviceId.HasValue)
        {
            var device = await _deviceRepository.GetByIdAsync(existingTicket.DeviceId.Value);
            if (device != null)
            {
                if (existingTicket.Status == TicketStatus.InProgress)
                {
                    device.Status = DeviceStatus.Maintenance;
                    _deviceRepository.Update(device);
                    await _deviceRepository.SaveChangesAsync();
                }
                else if (existingTicket.Status == TicketStatus.Resolved || existingTicket.Status == TicketStatus.Closed)
                {
                    // Check if there are other open tickets for this device
                    var allTickets = await _ticketRepository.GetAllAsync();
                    var hasOpenTickets = allTickets.Any(t => t.DeviceId == existingTicket.DeviceId && t.Id != existingTicket.Id && (t.Status == TicketStatus.Open || t.Status == TicketStatus.InProgress));
                    if (!hasOpenTickets)
                    {
                        device.Status = DeviceStatus.Active;
                        _deviceRepository.Update(device);
                        await _deviceRepository.SaveChangesAsync();
                    }
                }
            }
        }

        var responseDto = _mapper.Map<TicketResponseDto>(existingTicket);

        // SignalR üzerinden canlı bildirim
        await _hubContext.Clients.All.SendAsync("TicketUpdated", responseDto);

        return responseDto;
    }


    public async Task<IEnumerable<TicketResponseDto>> GetByDeviceIdAsync(Guid deviceId)
    {
        var allTickets = await _ticketRepository.GetAllAsync();
        var deviceTickets = allTickets.Where(t => t.DeviceId == deviceId).OrderByDescending(t => t.CreatedAt).ToList();
        return _mapper.Map<IEnumerable<TicketResponseDto>>(deviceTickets);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var ticket = await _ticketRepository.GetByIdAsync(id);
        if (ticket == null) return false;
        
        _ticketRepository.Remove(ticket);
        await _ticketRepository.SaveChangesAsync();

        if (ticket.DeviceId.HasValue)
        {
            var device = await _deviceRepository.GetByIdAsync(ticket.DeviceId.Value);
            if (device != null)
            {
                var allTickets = await _ticketRepository.GetAllAsync();
                var hasOpenTickets = allTickets.Any(t => t.DeviceId == ticket.DeviceId && t.Id != ticket.Id && (t.Status == TicketStatus.Open || t.Status == TicketStatus.InProgress || t.Status == TicketStatus.WaitingForUser));
                if (!hasOpenTickets)
                {
                    device.Status = Core.Enums.DeviceStatus.Active;
                    _deviceRepository.Update(device);
                    await _deviceRepository.SaveChangesAsync();
                }
            }
        }

        await _hubContext.Clients.All.SendAsync("TicketDeleted", id);
        
        return true;
    }
}
