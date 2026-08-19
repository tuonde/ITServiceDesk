using ITServiceDesk.Core.Wrappers;
using ITServiceDesk.Service.DTOs.Users;
using ITServiceDesk.Service.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace ITServiceDesk.API.Controllers;

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await _userService.GetAllUsersAsync();
        return Ok(ApiResponse<IEnumerable<UserListDto>>.Success(users));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var user = await _userService.GetUserByIdAsync(id);
        if (user == null)
            return NotFound(ApiResponse<UserListDto>.Fail("Kullanıcı bulunamadı."));

        return Ok(ApiResponse<UserListDto>.Success(user));
    }

    [HttpPost]
    public async Task<IActionResult> Create(UserCreateDto dto)
    {
        var user = await _userService.CreateUserAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, ApiResponse<UserListDto>.Success(user, "Kullanıcı başarıyla oluşturuldu."));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, UserUpdateDto dto)
    {
        var user = await _userService.UpdateUserAsync(id, dto);
        return Ok(ApiResponse<UserListDto>.Success(user, "Kullanıcı başarıyla güncellendi."));
    }

    [HttpPatch("{id}/toggle-status")]
    public async Task<IActionResult> ToggleStatus(Guid id)
    {
        var success = await _userService.ToggleUserStatusAsync(id);
        if (!success)
            return NotFound(ApiResponse<bool>.Fail("Kullanıcı bulunamadı."));

        return Ok(ApiResponse<bool>.Success(true, "Kullanıcı durumu değiştirildi."));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var message = await _userService.DeleteUserAsync(id);
        if (message == null)
            return NotFound(ApiResponse<bool>.Fail("Kullanıcı bulunamadı."));

        return Ok(ApiResponse<bool>.Success(true, message));
    }
}
