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
        var token = await _service.LoginAsync(dto);
        return Ok(ApiResponse<string>.Success(token, "Giriş başarılı."));
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDto dto)
    {
        var result = await _service.RegisterAsync(dto);
        return Ok(ApiResponse<UserResponseDto>.Success(result, "Kayıt başarılı."));
    }
}
