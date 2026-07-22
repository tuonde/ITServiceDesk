using ITServiceDesk.Service.DTOs.Auth;

namespace ITServiceDesk.Service.Interfaces;

public interface IAuthService
{
    Task<string> LoginAsync(LoginDto dto);
    Task<UserResponseDto> RegisterAsync(RegisterDto dto);
}
