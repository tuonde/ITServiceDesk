using AutoMapper;
using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Interfaces.Repositories;
using ITServiceDesk.Service.DTOs;
using ITServiceDesk.Service.Interfaces;
using Microsoft.Extensions.Logging;

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

    public async Task<IEnumerable<TicketResponseDto>> GetAllAsync(Guid userId, bool isAdmin)
    {
        var tickets = await _ticketRepository.GetTicketsWithDetailsAsync();
        
        if (!isAdmin)
        {
            tickets = tickets.Where(t => t.RequesterId == userId);
        }

        return _mapper.Map<IEnumerable<TicketResponseDto>>(tickets);
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
