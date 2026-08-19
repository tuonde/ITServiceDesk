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
    private readonly IUserContextService _userContext;

    public TicketsController(ITicketService ticketService, IUserContextService userContext)
    {
        _ticketService = ticketService;
        _userContext = userContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] TicketFilterDto filter)
    {
        var result = await _ticketService.GetAllAsync(filter, _userContext.UserId ?? Guid.Empty, _userContext.UserRoles);
        return Ok(result);
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string keyword)
    {
        var result = await _ticketService.SearchAsync(keyword, _userContext.UserId ?? Guid.Empty, _userContext.UserRoles);
        return Ok(ApiResponse<IEnumerable<TicketSearchDto>>.Success(result));
    }

    [HttpGet("device/{deviceId}")]
    public async Task<IActionResult> GetByDeviceId(Guid deviceId)
    {
        var result = await _ticketService.GetByDeviceIdAsync(deviceId, _userContext.UserId ?? Guid.Empty, _userContext.UserRoles);
        return Ok(ApiResponse<IEnumerable<TicketResponseDto>>.Success(result));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _ticketService.GetByIdAsync(id, _userContext.UserId ?? Guid.Empty, _userContext.UserRoles);
        if (result == null)
            return NotFound(ApiResponse<TicketResponseDto>.Fail("Ticket bulunamadı veya bu bileti görüntüleme yetkiniz yok."));
            
        return Ok(ApiResponse<TicketResponseDto>.Success(result));
    }

    [HttpPost]
    public async Task<IActionResult> Create(TicketCreateDto dto)
    {
        if (_userContext.UserId.HasValue)
        {
            dto.RequesterId = _userContext.UserId.Value;
        }

        var result = await _ticketService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, ApiResponse<TicketResponseDto>.Success(result, "Ticket oluşturuldu."));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, TicketUpdateDto dto)
    {
        if (id != dto.Id)
            return BadRequest(ApiResponse<TicketResponseDto>.Fail("ID uyuşmazlığı."));

        var result = await _ticketService.UpdateAsync(dto, _userContext.UserId ?? Guid.Empty, _userContext.UserRoles);
        return Ok(ApiResponse<TicketResponseDto>.Success(result, "Ticket güncellendi."));
    }


    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await _ticketService.DeleteAsync(id, _userContext.UserId ?? Guid.Empty, _userContext.UserRoles);
        if (!success)
            return NotFound(ApiResponse<bool>.Fail("Ticket bulunamadı veya silme yetkiniz yok."));

        return Ok(ApiResponse<bool>.Success(true, "Ticket silindi."));
    }

    [HttpPost("{id}/reopen")]
    public async Task<IActionResult> Reopen(Guid id, [FromBody] TicketReopenDto dto)
    {
        if (!_userContext.UserId.HasValue)
            return Unauthorized(ApiResponse<TicketResponseDto>.Fail("Geçersiz kullanıcı."));

        var result = await _ticketService.ReopenAsync(id, dto, _userContext.UserId.Value);
        return Ok(ApiResponse<TicketResponseDto>.Success(result, "Ticket yeniden açıldı."));
    }
}
