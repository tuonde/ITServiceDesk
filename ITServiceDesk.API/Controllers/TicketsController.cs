using ITServiceDesk.Core.Wrappers;
using ITServiceDesk.Service.DTOs;
using ITServiceDesk.Service.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace ITServiceDesk.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class TicketsController : ControllerBase
{
    private readonly ITicketService _ticketService;

    public TicketsController(ITicketService ticketService)
    {
        _ticketService = ticketService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] TicketFilterDto filter)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        _ = Guid.TryParse(userIdClaim, out var userId);
        var isAdmin = User.IsInRole("Admin");

        var result = await _ticketService.GetAllAsync(filter, userId, isAdmin);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _ticketService.GetByIdAsync(id);
        if (result == null)
            return NotFound(ApiResponse<TicketResponseDto>.Fail("Ticket bulunamadı."));
            
        return Ok(ApiResponse<TicketResponseDto>.Success(result));
    }

    [HttpPost]
    public async Task<IActionResult> Create(TicketCreateDto dto)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(userIdClaim, out var userId))
        {
            dto.RequesterId = userId;
        }

        var result = await _ticketService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, ApiResponse<TicketResponseDto>.Success(result, "Ticket oluşturuldu."));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, TicketUpdateDto dto)
    {
        if (id != dto.Id)
            return BadRequest(ApiResponse<TicketResponseDto>.Fail("ID uyuşmazlığı."));

        var result = await _ticketService.UpdateAsync(dto);
        return Ok(ApiResponse<TicketResponseDto>.Success(result, "Ticket güncellendi."));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await _ticketService.DeleteAsync(id);
        if (!success)
            return NotFound(ApiResponse<bool>.Fail("Ticket bulunamadı."));

        return Ok(ApiResponse<bool>.Success(true, "Ticket silindi."));
    }
}
