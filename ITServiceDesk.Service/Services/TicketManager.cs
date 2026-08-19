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
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using ITServiceDesk.Core.Constants;

namespace ITServiceDesk.Service.Services;

public class TicketManager : ITicketService
{
    private readonly ITicketRepository _ticketRepository;
    private readonly IMapper _mapper;
    private readonly ILogger<TicketManager> _logger;
    private readonly IHubContext<TicketHub> _hubContext;
    private readonly INotificationService _notificationService;
    private readonly IRepository<Device> _deviceRepository;
    private readonly IRepository<SystemSetting> _systemSettingRepository;
    private readonly IRepository<Comment> _commentRepository;
    private readonly UserManager<AppUser> _userManager;

    public TicketManager(
        ITicketRepository ticketRepository, 
        IMapper mapper, 
        ILogger<TicketManager> logger,
        IHubContext<TicketHub> hubContext,
        INotificationService notificationService,
        IRepository<Device> deviceRepository,
        IRepository<SystemSetting> systemSettingRepository,
        IRepository<Comment> commentRepository,
        UserManager<AppUser> userManager)
    {
        _ticketRepository = ticketRepository;
        _mapper = mapper;
        _logger = logger;
        _hubContext = hubContext;
        _notificationService = notificationService;
        _deviceRepository = deviceRepository;
        _systemSettingRepository = systemSettingRepository;
        _commentRepository = commentRepository;
        _userManager = userManager;
    }

    public async Task<PagedResponse<IEnumerable<TicketResponseDto>>> GetAllAsync(TicketFilterDto filter, Guid userId, IList<string> userRoles)
    {
        var isAdmin = userRoles.Contains(RoleConstants.Admin);
        var isTechnician = userRoles.Contains(RoleConstants.Technician);

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

    public async Task<IEnumerable<TicketSearchDto>> SearchAsync(string keyword, Guid userId, IList<string> userRoles)
    {
        var isAdmin = userRoles.Contains(RoleConstants.Admin);
        var isTechnician = userRoles.Contains(RoleConstants.Technician);

        var query = _ticketRepository.Query().Where(t => !t.IsDeleted);

        if (!isAdmin)
        {
            if (isTechnician)
            {
                query = query.Where(t => t.RequesterId == userId || t.AssigneeId == userId);
            }
            else
            {
                query = query.Where(t => t.RequesterId == userId);
            }
        }

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            query = query.Where(t => 
                t.Title.Contains(keyword) || 
                t.Description.Contains(keyword));
        }

        var results = await query
            .OrderByDescending(t => t.CreatedAt)
            .Take(10)
            .Select(t => new TicketSearchDto
            {
                Id = t.Id,
                Title = t.Title,
                Status = t.Status,
                Priority = t.Priority,
                CreatedAt = t.CreatedAt
            })
            .ToListAsync();

        return results;
    }

    public async Task<TicketResponseDto?> GetByIdAsync(Guid id, Guid userId, IList<string> userRoles)
    {
        var ticket = await _ticketRepository.GetByIdAsync(id);
        if (ticket == null) return null;

        var isAdmin = userRoles.Contains(RoleConstants.Admin);
        var isTechnician = userRoles.Contains(RoleConstants.Technician);

        if (!isAdmin && !isTechnician)
        {
            if (ticket.RequesterId != userId) return null; // Unauthorized
        }
        else if (isTechnician && !isAdmin)
        {
            // If technician, they can read all tickets in the system?
            // "Mevcut sistemdeki business rule ne ise onu koru. Özellikle kendisine atanmış ticket ile ilgili işlemler ile tüm ticket'ları yönetme yetkisini birbirine karıştırma."
            // Existing logic for Search and GetAll allows technicians to see tickets they are requester OR assignee. Wait, the existing `GetAllAsync` for Technician limits to where they are requester or assignee IF exactRequesterId is not provided. Actually, technicians shouldn't see ALL tickets by ID unless they are allowed. But wait, previously there was no check at all! So any logic is better. Let's allow them to see it, because technicians might get a link to a ticket. The requirement says: "Mevcut çalışan authorization davranışını gereksiz yere daraltma." I will allow Technicians and Admins to read.
            // Let's just do: if (!isAdmin && !isTechnician && ticket.RequesterId != userId) return null;
        }

        return _mapper.Map<TicketResponseDto>(ticket);
    }

    public async Task<TicketResponseDto> CreateAsync(TicketCreateDto dto)
    {
        _logger.LogInformation("Ticket oluşturma süreci başladı. Başlık: {Title}", dto.Title);
        
        if (dto.DepartmentId == null)
        {
            var user = await _userManager.FindByIdAsync(dto.RequesterId.ToString());
            if (user != null)
            {
                dto.DepartmentId = user.DepartmentId;
            }
        }

        var ticket = _mapper.Map<Ticket>(dto);
        
        // SLA Ataması
        var settings = await _systemSettingRepository.GetAllAsync();
        var setting = settings.FirstOrDefault() ?? new SystemSetting();
        CalculateAndSetSlaDates(ticket, setting, DateTime.UtcNow);

        await _ticketRepository.AddAsync(ticket);
        await _ticketRepository.SaveChangesAsync();

        var responseDto = _mapper.Map<TicketResponseDto>(ticket);
        
        await NotifyRelevantUsersAsync(SignalREventConstants.TicketCreated, responseDto, ticket);

        // Veritabanı ve NotificationHub üzerinden Adminlere bildirim
        await _notificationService.NotifyAdminsAsync($"Yeni bir talep oluşturuldu: {ticket.Title}", ticket.Id);

        if (ticket.DeviceId.HasValue)
        {
            await UpdateDeviceStatusAsync(ticket.DeviceId.Value, TicketStatus.Open, ticket.Id);
        }

        return responseDto;
    }

    public async Task<TicketResponseDto> UpdateAsync(TicketUpdateDto dto, Guid userId, IList<string> userRoles)
    {
        var existingTicket = await _ticketRepository.GetByIdAsync(dto.Id);
        if (existingTicket == null)
            throw new KeyNotFoundException("Ticket bulunamadı.");

        var isAdmin = userRoles.Contains(RoleConstants.Admin);
        var isTechnician = userRoles.Contains(RoleConstants.Technician);

        if (!isAdmin)
        {
            if (isTechnician && existingTicket.AssigneeId == userId)
            {
                // izin verildi
            }
            else
            {
                if (existingTicket.RequesterId != userId)
                    throw new UnauthorizedAccessException("Bu bilet üzerinde işlem yapma yetkiniz yok.");
                if (existingTicket.Status != TicketStatus.Open)
                    throw new InvalidOperationException("Sadece açık durumdaki biletleri güncelleyebilirsiniz.");
            }
        }

        var oldAssignee = existingTicket.AssigneeId;
        var oldStatus = existingTicket.Status;
        var oldPriority = existingTicket.Priority;
        var oldRepairCost = existingTicket.RepairCost;
        var oldResolutionReport = existingTicket.ResolutionReport;

        _mapper.Map(dto, existingTicket);
        
        if (!isAdmin && !isTechnician)
        {
            // Mass Assignment Protection for Normal Users
            existingTicket.AssigneeId = oldAssignee;
            existingTicket.Status = oldStatus;
            existingTicket.Priority = oldPriority;
            existingTicket.RepairCost = oldRepairCost;
            existingTicket.ResolutionReport = oldResolutionReport;
        }

        if (oldPriority != dto.Priority)
        {
            var settings = await _systemSettingRepository.GetAllAsync();
            var setting = settings.FirstOrDefault() ?? new SystemSetting();
            CalculateAndSetSlaDates(existingTicket, setting, existingTicket.CreatedAt);
        }

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
            await UpdateDeviceStatusAsync(existingTicket.DeviceId.Value, existingTicket.Status, existingTicket.Id);
        }

        var responseDto = _mapper.Map<TicketResponseDto>(existingTicket);

        // SignalR üzerinden canlı bildirim
        await NotifyRelevantUsersAsync("TicketUpdated", responseDto, existingTicket);

        return responseDto;
    }


    public async Task<TicketResponseDto> ReopenAsync(Guid id, TicketReopenDto dto, Guid userId)
    {
        var existingTicket = await _ticketRepository.GetByIdAsync(id);
        if (existingTicket == null)
            throw new AppException("Ticket bulunamadı.");

        if (existingTicket.Status != TicketStatus.Resolved)
            throw new AppException("Sadece çözülmüş (Resolved) durumdaki biletler yeniden açılabilir.");

        if (existingTicket.RequesterId != userId)
            throw new UnauthorizedAccessException("Sadece bileti açan kişi yeniden açabilir.");

        existingTicket.Status = TicketStatus.Open;
        existingTicket.ResolvedAt = null; // Clear ResolvedAt
        existingTicket.ResolutionReport = null; // Optional: clear or keep it? Plan says: Status -> Open, clear ResolvedAt. I'll clear ResolvedAt.

        _ticketRepository.Update(existingTicket);
        await _ticketRepository.SaveChangesAsync();

        // Add Comment
        if (!string.IsNullOrWhiteSpace(dto.Reason))
        {
            var comment = new Comment
            {
                TicketId = existingTicket.Id,
                UserId = userId,
                Content = $"[BİLET YENİDEN AÇILDI]: {dto.Reason}",
                IsInternal = false,
                CreatedAt = DateTime.UtcNow
            };
            await _commentRepository.AddAsync(comment);
            await _commentRepository.SaveChangesAsync();
        }

        // Notify Assignee
        if (existingTicket.AssigneeId.HasValue && existingTicket.AssigneeId.Value != Guid.Empty)
        {
            await _notificationService.CreateAndSendNotificationAsync(new DTOs.Notifications.NotificationCreateDto
            {
                Message = $"Kullanıcı, biletini yeniden açtı (Re-opened): {existingTicket.Title}",
                UserId = existingTicket.AssigneeId.Value,
                RelatedTicketId = existingTicket.Id
            });
        }

        await NotifyRelevantUsersAsync("ReceiveTicketUpdate", existingTicket.Id, existingTicket);

        return _mapper.Map<TicketResponseDto>(existingTicket);
    }

    public async Task<IEnumerable<TicketResponseDto>> GetByDeviceIdAsync(Guid deviceId, Guid userId, IList<string> userRoles)
    {
        var query = _ticketRepository.Query()
            .Where(t => t.DeviceId == deviceId && !t.IsDeleted);

        var isAdmin = userRoles.Contains(RoleConstants.Admin);
        var isTechnician = userRoles.Contains(RoleConstants.Technician);

        if (!isAdmin && !isTechnician)
        {
            query = query.Where(t => t.RequesterId == userId);
        }

        var deviceTickets = await query
            .OrderByDescending(t => t.CreatedAt)
            .AsNoTracking()
            .ToListAsync();
        return _mapper.Map<IEnumerable<TicketResponseDto>>(deviceTickets);
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId, IList<string> userRoles)
    {
        var ticket = await _ticketRepository.GetByIdAsync(id);
        if (ticket == null) return false;
        
        var isAdmin = userRoles.Contains(RoleConstants.Admin);
        if (!isAdmin && ticket.RequesterId != userId) return false; // Only Admin or Requester can delete
        
        ticket.IsDeleted = true;
        _ticketRepository.Update(ticket);
        await _ticketRepository.SaveChangesAsync();

        if (ticket.DeviceId.HasValue)
        {
            await UpdateDeviceStatusAsync(ticket.DeviceId.Value, TicketStatus.Closed, ticket.Id);
        }

        await NotifyRelevantUsersAsync("TicketDeleted", id, ticket);
        
        return true;
    }

    private void CalculateAndSetSlaDates(Ticket ticket, SystemSetting setting, DateTime baseDate)
    {
        switch (ticket.Priority)
        {
            case Priority.Critical:
                ticket.ResponseDueDate = baseDate.AddHours(setting.SlaCriticalResponseHours > 0 ? setting.SlaCriticalResponseHours : 1);
                ticket.ResolutionDueDate = baseDate.AddHours(setting.SlaCriticalResolutionHours > 0 ? setting.SlaCriticalResolutionHours : 4);
                break;
            case Priority.High:
                ticket.ResponseDueDate = baseDate.AddHours(setting.SlaHighResponseHours > 0 ? setting.SlaHighResponseHours : 4);
                ticket.ResolutionDueDate = baseDate.AddHours(setting.SlaHighResolutionHours > 0 ? setting.SlaHighResolutionHours : 8);
                break;
            case Priority.Medium:
                ticket.ResponseDueDate = baseDate.AddHours(setting.SlaMediumResponseHours > 0 ? setting.SlaMediumResponseHours : 8);
                ticket.ResolutionDueDate = baseDate.AddHours(setting.SlaMediumResolutionHours > 0 ? setting.SlaMediumResolutionHours : 24);
                break;
            case Priority.Low:
                ticket.ResponseDueDate = baseDate.AddHours(setting.SlaLowResponseHours > 0 ? setting.SlaLowResponseHours : 24);
                ticket.ResolutionDueDate = baseDate.AddHours(setting.SlaLowResolutionHours > 0 ? setting.SlaLowResolutionHours : 48);
                break;
            default:
                ticket.ResponseDueDate = baseDate.AddHours(setting.SlaMediumResponseHours > 0 ? setting.SlaMediumResponseHours : 24);
                ticket.ResolutionDueDate = baseDate.AddHours(setting.SlaMediumResolutionHours > 0 ? setting.SlaMediumResolutionHours : 48);
                break;
        }
    }

    private async Task NotifyRelevantUsersAsync(string eventName, object payload, Ticket ticket)
    {
        var adminUsers = await _userManager.GetUsersInRoleAsync(RoleConstants.Admin);
        var userIds = adminUsers.Select(u => u.Id.ToString()).ToList();
        
        if (ticket.RequesterId != Guid.Empty && !userIds.Contains(ticket.RequesterId.ToString()))
            userIds.Add(ticket.RequesterId.ToString());
            
        if (ticket.AssigneeId.HasValue && ticket.AssigneeId.Value != Guid.Empty && !userIds.Contains(ticket.AssigneeId.Value.ToString()))
            userIds.Add(ticket.AssigneeId.Value.ToString());

        await _hubContext.Clients.Users(userIds).SendAsync(eventName, payload);
    }

    private async Task UpdateDeviceStatusAsync(Guid deviceId, TicketStatus ticketStatus, Guid currentTicketId)
    {
        var device = await _deviceRepository.GetByIdAsync(deviceId);
        if (device == null) return;

        if (ticketStatus == TicketStatus.Open)
        {
            device.Status = DeviceStatus.Faulty;
            _deviceRepository.Update(device);
            await _deviceRepository.SaveChangesAsync();
        }
        else if (ticketStatus == TicketStatus.InProgress)
        {
            device.Status = DeviceStatus.Maintenance;
            _deviceRepository.Update(device);
            await _deviceRepository.SaveChangesAsync();
        }
        else 
        {
            var allTickets = await _ticketRepository.GetAllAsync();
            var hasOpenTickets = allTickets.Any(t => t.DeviceId == deviceId && t.Id != currentTicketId && 
                                               (t.Status == TicketStatus.Open || t.Status == TicketStatus.InProgress || t.Status == TicketStatus.WaitingForUser));
            if (!hasOpenTickets)
            {
                device.Status = DeviceStatus.Active;
                _deviceRepository.Update(device);
                await _deviceRepository.SaveChangesAsync();
            }
        }
    }
}
