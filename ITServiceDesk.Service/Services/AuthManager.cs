using ITServiceDesk.Core.Entities;
using Microsoft.Extensions.Logging;
using ITServiceDesk.Service.DTOs.Auth;
using ITServiceDesk.Service.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace ITServiceDesk.Service.Services;

public class AuthManager : IAuthService
{
    private readonly UserManager<AppUser> _userManager;
    private readonly SignInManager<AppUser> _signInManager;
    private readonly RoleManager<IdentityRole<Guid>> _roleManager;
    private readonly IConfiguration _configuration;
    private readonly ISystemSettingsService _settingsService;
    private readonly ILogger<AuthManager> _logger;

    public AuthManager(
        UserManager<AppUser> userManager, 
        SignInManager<AppUser> signInManager, 
        RoleManager<IdentityRole<Guid>> roleManager,
        IConfiguration configuration,
        ISystemSettingsService settingsService,
        ILogger<AuthManager> logger)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _roleManager = roleManager;
        _configuration = configuration;
        _settingsService = settingsService;
        _logger = logger;
    }

    public async Task<string> LoginAsync(LoginDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null)
        {
            _logger.LogWarning("Başarısız giriş denemesi: {Email} - Kullanıcı bulunamadı.", dto.Email);
            throw new AppException("Geçersiz e-posta veya şifre.");
        }

        var result = await _signInManager.CheckPasswordSignInAsync(user, dto.Password, lockoutOnFailure: true);
        if (result.IsLockedOut)
        {
            _logger.LogWarning("Hesap kilitlendi: {Email}", dto.Email);
            throw new AppException("Hesabınız çok fazla başarısız deneme nedeniyle kilitlendi. Lütfen daha sonra tekrar deneyin.");
        }

        if (!result.Succeeded)
        {
            _logger.LogWarning("Başarısız giriş denemesi: {Email} - Geçersiz şifre.", dto.Email);
            throw new AppException("Geçersiz e-posta veya şifre.");
        }

        _logger.LogInformation("Başarılı giriş: {Email}", dto.Email);
        return await GenerateJwtToken(user);
    }

    public async Task<UserResponseDto> RegisterAsync(RegisterDto dto)
    {
        var existingUser = await _userManager.FindByEmailAsync(dto.Email);
        if (existingUser != null)
            throw new AppException("Bu e-posta adresi zaten kullanımda.");

        // Rollerin varlığını kontrol et ve yoksa oluştur
        if (!await _roleManager.RoleExistsAsync("Admin"))
            await _roleManager.CreateAsync(new IdentityRole<Guid>("Admin"));
            
        if (!await _roleManager.RoleExistsAsync("Technician"))
            await _roleManager.CreateAsync(new IdentityRole<Guid>("Technician"));
            
        if (!await _roleManager.RoleExistsAsync("User"))
            await _roleManager.CreateAsync(new IdentityRole<Guid>("User"));

        var user = new AppUser
        {
            UserName = dto.Email,
            Email = dto.Email,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            DepartmentId = dto.DepartmentId
        };

        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new AppException($"Kayıt işlemi başarısız: {errors}");
        }

        // Yeni kullanıcılara varsayılan olarak "User" rolünü ata
        await _userManager.AddToRoleAsync(user, "User");

        return new UserResponseDto
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email
        };
    }

    private async Task<string> GenerateJwtToken(AppUser user)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings["SecretKey"];

        if (secretKey == "[SECRET_KEY_PLACEHOLDER]" || string.IsNullOrWhiteSpace(secretKey))
        {
            var envSecret = Environment.GetEnvironmentVariable("JWT_SECRET");
            if (!string.IsNullOrWhiteSpace(envSecret))
            {
                secretKey = envSecret;
            }
            else
            {
                // Development fallback
                secretKey = "DevelopmentSuperSecretKeyForLocalHost123456789!";
            }
        }

        if (string.IsNullOrWhiteSpace(secretKey))
            throw new ArgumentNullException("JwtSettings:SecretKey bulunamadı.");
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email ?? string.Empty),
            new Claim(ClaimTypes.GivenName, user.FirstName ?? string.Empty),
            new Claim(ClaimTypes.Surname, user.LastName ?? string.Empty)
        };

        var roles = await _userManager.GetRolesAsync(user);
        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var settings = await _settingsService.GetSettingsAsync();
        var expiryMinutes = settings.SessionTimeoutMinutes;

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
