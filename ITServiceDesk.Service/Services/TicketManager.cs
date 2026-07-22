using AutoMapper;
using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Interfaces.Repositories;
using ITServiceDesk.Core.Wrappers;
using ITServiceDesk.Service.DTOs;
using ITServiceDesk.Service.Interfaces;
using Microsoft.Extensions.Logging;
using ITServiceDesk.Core.Enums;

namespace ITServiceDesk.Service.Services;

public class TicketManager : ITicketService
{
    private readonly ITicketRepository _ticketRepository;
    private readonly IMapper _mapper;
    private readonly ILogger<TicketManager> _logger;

    public TicketManager(
        ITicketRepository ticketRepository, 
        IMapper mapper, 
        ILogger<TicketManager> logger)
    {
        _ticketRepository = ticketRepository;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<PagedResponse<IEnumerable<TicketResponseDto>>> GetAllAsync(TicketFilterDto filter, Guid userId, bool isAdmin)
    {
        Guid? requesterId = isAdmin ? null : userId;
        var (tickets, totalCount) = await _ticketRepository.GetPagedTicketsAsync(
            filter.PageNumber, 
            filter.PageSize, 
            filter.Status, 
            filter.Priority, 
            requesterId);

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

        return _mapper.Map<TicketResponseDto>(ticket);
    }

    public async Task<TicketResponseDto> UpdateAsync(TicketUpdateDto dto)
    {
        var existingTicket = await _ticketRepository.GetByIdAsync(dto.Id);
        if (existingTicket == null)
            throw new Exception("Ticket bulunamadı.");

        _mapper.Map(dto, existingTicket);
        _ticketRepository.Update(existingTicket);
        await _ticketRepository.SaveChangesAsync();

        return _mapper.Map<TicketResponseDto>(existingTicket);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var ticket = await _ticketRepository.GetByIdAsync(id);
        if (ticket == null) return false;
        
        _ticketRepository.Remove(ticket);
        await _ticketRepository.SaveChangesAsync();
        return true;
    }
}
