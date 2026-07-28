using ITServiceDesk.Core.Entities;
using ITServiceDesk.Data.Contexts;
using ITServiceDesk.Service.DTOs.Users;
using ITServiceDesk.Service.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace ITServiceDesk.Service.Services;

public class UserService : IUserService
{
    private readonly UserManager<AppUser> _userManager;
    private readonly ITServiceDeskDbContext _context;
    private readonly ISystemSettingsService _settingsService;

    public UserService(UserManager<AppUser> userManager, ITServiceDeskDbContext context, ISystemSettingsService settingsService)
    {
        _userManager = userManager;
        _context = context;
        _settingsService = settingsService;
    }

    public async Task<IEnumerable<UserListDto>> GetAllUsersAsync()
    {
        var users = await _context.Users
            .Include(u => u.Department)
            .ToListAsync();

        var result = new List<UserListDto>();

        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            result.Add(new UserListDto
            {
                Id = user.Id,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email ?? "",
                DepartmentId = user.DepartmentId,
                DepartmentName = user.Department?.Name ?? "",
                IsActive = user.IsActive,
                Roles = roles,
                PhoneNumber = user.PhoneNumber
            });
        }

        return result;
    }

    public async Task<UserListDto?> GetUserByIdAsync(Guid id)
    {
        var user = await _context.Users
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null) return null;

        var roles = await _userManager.GetRolesAsync(user);

        return new UserListDto
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email ?? "",
            DepartmentId = user.DepartmentId,
            DepartmentName = user.Department?.Name ?? "",
            IsActive = user.IsActive,
            Roles = roles,
            PhoneNumber = user.PhoneNumber
        };
    }

    public async Task<UserListDto> CreateUserAsync(UserCreateDto dto)
    {
        var user = new AppUser
        {
            UserName = dto.Email,
            Email = dto.Email,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            DepartmentId = dto.DepartmentId,
            IsActive = true,
            PhoneNumber = dto.PhoneNumber
        };

        // Otomatik şifre oluştur: (Örn: adSoyad@123 veya random)
        // Güvenlik gereği basit bir başlangıç şifresi, gerçekte Random string üretilebilir.
        var randomPassword = Guid.NewGuid().ToString("N").Substring(0, 8) + "aA1!"; 
        
        var result = await _userManager.CreateAsync(user, randomPassword);
        
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new Exception($"Kullanıcı oluşturulamadı: {errors}");
        }

        // Role atama
        if (!string.IsNullOrEmpty(dto.Role))
        {
            await _userManager.AddToRoleAsync(user, dto.Role);
        }

        var createdUser = await GetUserByIdAsync(user.Id) ?? throw new Exception("Kullanıcı oluşturuldu ancak getirilemedi.");
        createdUser.GeneratedPassword = randomPassword;
        return createdUser;
    }

    public async Task<UserListDto> UpdateUserAsync(Guid id, UserUpdateDto dto)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null) throw new Exception("Kullanıcı bulunamadı.");

        user.FirstName = dto.FirstName;
        user.LastName = dto.LastName;
        user.Email = dto.Email;
        user.UserName = dto.Email;
        user.DepartmentId = dto.DepartmentId;
        user.IsActive = dto.IsActive;
        user.PhoneNumber = dto.PhoneNumber;

        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            throw new Exception("Kullanıcı güncellenemedi.");
        }

        // Mevcut rolleri al
        var currentRoles = await _userManager.GetRolesAsync(user);
        
        // Eğer seçilen rol mevcut rolden farklıysa
        if (!currentRoles.Contains(dto.Role))
        {
            await _userManager.RemoveFromRolesAsync(user, currentRoles);
            await _userManager.AddToRoleAsync(user, dto.Role);
        }

        return await GetUserByIdAsync(user.Id) ?? throw new Exception("Kullanıcı güncellendi ancak getirilemedi.");
    }

    public async Task<bool> ToggleUserStatusAsync(Guid id)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null) return false;

        user.IsActive = !user.IsActive;
        await _userManager.UpdateAsync(user);
        
        return true;
    }

    public async Task<string?> DeleteUserAsync(Guid id)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null) return null;

        try
        {
            var result = await _userManager.DeleteAsync(user);
            return result.Succeeded ? "Kullanıcı başarıyla silindi." : null;
        }
        catch (DbUpdateException)
        {
            user.IsActive = false;
            await _userManager.UpdateAsync(user);
            return "Bu kullanıcıya ait geçmiş kayıtlar (bilet, log) bulunduğu için veritabanından silinemedi, bunun yerine Pasife Alındı.";
        }
    }

    public async Task<UserListDto> UpdateProfileAsync(Guid userId, ITServiceDesk.Service.DTOs.Profile.ProfileUpdateDto dto)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null) throw new Exception("Kullanıcı bulunamadı.");

        user.FirstName = dto.FirstName;
        user.LastName = dto.LastName;
        user.PhoneNumber = dto.PhoneNumber;

        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            var errors = string.Join(", ", updateResult.Errors.Select(e => e.Description));
            throw new Exception($"Profil güncellenemedi: {errors}");
        }

        return await GetUserByIdAsync(user.Id) ?? throw new Exception("Profil güncellendi ancak getirilemedi.");
    }

    public async Task<bool> ChangePasswordAsync(Guid userId, ITServiceDesk.Service.DTOs.Profile.ChangePasswordDto dto)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null) return false;

        var settings = await _settingsService.GetSettingsAsync();

        if (dto.NewPassword.Length < settings.PasswordMinLength)
            throw new Exception($"Şifreniz en az {settings.PasswordMinLength} karakter olmalıdır.");
            
        if (settings.PasswordRequireUppercase && !dto.NewPassword.Any(char.IsUpper))
            throw new Exception("Şifreniz en az bir büyük harf içermelidir.");

        var result = await _userManager.ChangePasswordAsync(user, dto.CurrentPassword, dto.NewPassword);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new Exception($"Şifre değiştirilemedi: {errors}");
        }

        return true;
    }
}
