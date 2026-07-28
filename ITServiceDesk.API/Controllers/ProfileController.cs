using ITServiceDesk.Core.Wrappers;
using ITServiceDesk.Service.DTOs.Profile;
using ITServiceDesk.Service.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ITServiceDesk.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ProfileController : ControllerBase
{
    private readonly IUserService _userService;

    public ProfileController(IUserService userService)
    {
        _userService = userService;
    }

    private Guid GetUserId()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(userIdString, out Guid userId))
        {
            return userId;
        }
        throw new Exception("Kullanıcı kimliği bulunamadı.");
    }

    [HttpGet]
    public async Task<IActionResult> GetMyProfile()
    {
        var user = await _userService.GetUserByIdAsync(GetUserId());
        if (user == null)
            return NotFound(ApiResponse<object>.Fail("Profil bulunamadı."));

        return Ok(ApiResponse<object>.Success(user));
    }

    [HttpPut]
    public async Task<IActionResult> UpdateProfile(ProfileUpdateDto dto)
    {
        try
        {
            var user = await _userService.UpdateProfileAsync(GetUserId(), dto);
            return Ok(ApiResponse<object>.Success(user, "Profiliniz başarıyla güncellendi."));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<object>.Fail(ex.Message));
        }
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordDto dto)
    {
        try
        {
            await _userService.ChangePasswordAsync(GetUserId(), dto);
            return Ok(ApiResponse<bool>.Success(true, "Şifreniz başarıyla değiştirildi."));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<bool>.Fail(ex.Message));
        }
    }
}
