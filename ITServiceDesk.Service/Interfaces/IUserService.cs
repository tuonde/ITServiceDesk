using ITServiceDesk.Service.DTOs.Users;
using ITServiceDesk.Service.DTOs.Profile;

namespace ITServiceDesk.Service.Interfaces;

public interface IUserService
{
    Task<IEnumerable<UserListDto>> GetAllUsersAsync();
    Task<UserListDto?> GetUserByIdAsync(Guid id);
    Task<UserListDto> CreateUserAsync(UserCreateDto dto);
    Task<UserListDto> UpdateUserAsync(Guid id, UserUpdateDto dto);
    Task<bool> ToggleUserStatusAsync(Guid id);
    Task<string?> DeleteUserAsync(Guid id);
    Task<UserListDto> UpdateProfileAsync(Guid userId, ProfileUpdateDto dto);
    Task<bool> ChangePasswordAsync(Guid userId, ChangePasswordDto dto);
}
