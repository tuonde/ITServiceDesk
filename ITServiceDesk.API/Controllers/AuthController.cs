using ITServiceDesk.Core.Wrappers;
using ITServiceDesk.Service.DTOs.Auth;
using ITServiceDesk.Service.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ITServiceDesk.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _service;
    public AuthController(IAuthService service) => _service = service;

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        try
        {
            var token = await _service.LoginAsync(dto);
            return Ok(ApiResponse<string>.Success(token, "Giriş başarılı."));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<string>.Fail(ex.Message));
        }
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDto dto)
    {
        try
        {
            var result = await _service.RegisterAsync(dto);
            return Ok(ApiResponse<UserResponseDto>.Success(result, "Kayıt başarılı."));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<UserResponseDto>.Fail(ex.Message));
        }
    }
}
