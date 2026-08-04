using ITServiceDesk.Core.Wrappers;
using ITServiceDesk.Service.DTOs;
using ITServiceDesk.Service.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

using ITServiceDesk.Core.Entities;
using Microsoft.AspNetCore.Identity;

namespace ITServiceDesk.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class TicketsController : ControllerBase
{
    private readonly ITicketService _ticketService;
    private readonly UserManager<AppUser> _userManager;

    public TicketsController(ITicketService ticketService, UserManager<AppUser> userManager)
    {
        _ticketService = ticketService;
        _userManager = userManager;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] TicketFilterDto filter)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        _ = Guid.TryParse(userIdClaim, out var userId);
        
        var userRoles = User.Claims.Where(c => c.Type == ClaimTypes.Role).Select(c => c.Value).ToList();

        var result = await _ticketService.GetAllAsync(filter, userId, userRoles);
        return Ok(result);
    }

    [HttpGet("device/{deviceId}")]
    public async Task<IActionResult> GetByDeviceId(Guid deviceId)
    {
        var result = await _ticketService.GetByDeviceIdAsync(deviceId);
        return Ok(ApiResponse<IEnumerable<TicketResponseDto>>.Success(result));
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
            
            if (dto.DepartmentId == null)
            {
                var user = await _userManager.FindByIdAsync(userIdClaim);
                if (user != null)
                {
                    dto.DepartmentId = user.DepartmentId;
                }
            }
        }

        var result = await _ticketService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, ApiResponse<TicketResponseDto>.Success(result, "Ticket oluşturuldu."));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, TicketUpdateDto dto)
    {
        if (id != dto.Id)
            return BadRequest(ApiResponse<TicketResponseDto>.Fail("ID uyuşmazlığı."));

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        _ = Guid.TryParse(userIdClaim, out var userId);
        var isAdmin = User.IsInRole("Admin");
        var isTechnician = User.IsInRole("Technician");

        try
        {
            var existingTicket = await _ticketService.GetByIdAsync(id);
            if (existingTicket == null)
                return NotFound(ApiResponse<TicketResponseDto>.Fail("Ticket bulunamadı."));

            if (!isAdmin)
            {
                // Teknisyense ve kendine atanmışsa izin ver
                if (isTechnician && existingTicket.AssigneeId == userId)
                {
                    // izin verildi
                }
                else
                {
                    if (existingTicket.RequesterId != userId)
                        return Forbid();
                    if (existingTicket.Status != ITServiceDesk.Core.Enums.TicketStatus.Open)
                        return BadRequest(ApiResponse<TicketResponseDto>.Fail("Sadece açık durumdaki biletleri güncelleyebilirsiniz."));
                }
            }

            var result = await _ticketService.UpdateAsync(dto);
            return Ok(ApiResponse<TicketResponseDto>.Success(result, "Ticket güncellendi."));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<TicketResponseDto>.Fail($"Update failed: {ex.Message} - Inner: {ex.InnerException?.Message} - Trace: {ex.StackTrace}"));
        }
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
