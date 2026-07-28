using ITServiceDesk.Core.Entities;
using ITServiceDesk.Data.Contexts;
using ITServiceDesk.Service.DTOs.Settings;
using ITServiceDesk.Service.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;

namespace ITServiceDesk.Service.Services;

public class SystemSettingsService : ISystemSettingsService
{
    private readonly ITServiceDeskDbContext _context;

    public SystemSettingsService(ITServiceDeskDbContext context)
    {
        _context = context;
    }

    public async Task<SystemSettingsDto> GetSettingsAsync()
    {
        var settings = await _context.SystemSettings.FirstOrDefaultAsync();
        
        if (settings == null)
        {
            settings = new SystemSetting
            {
                AppName = "IT Service Desk",
                SessionTimeoutMinutes = 30,
                PasswordMinLength = 6,
                PasswordRequireUppercase = false
            };
            _context.SystemSettings.Add(settings);
            await _context.SaveChangesAsync();
        }

        return new SystemSettingsDto
        {
            AppName = settings.AppName,
            SessionTimeoutMinutes = settings.SessionTimeoutMinutes,
            PasswordMinLength = settings.PasswordMinLength,
            PasswordRequireUppercase = settings.PasswordRequireUppercase
        };
    }

    public async Task UpdateSettingsAsync(SystemSettingsDto dto)
    {
        var settings = await _context.SystemSettings.FirstOrDefaultAsync();

        if (settings == null)
        {
            settings = new SystemSetting();
            _context.SystemSettings.Add(settings);
        }

        settings.AppName = dto.AppName;
        settings.SessionTimeoutMinutes = dto.SessionTimeoutMinutes;
        settings.PasswordMinLength = dto.PasswordMinLength;
        settings.PasswordRequireUppercase = dto.PasswordRequireUppercase;

        await _context.SaveChangesAsync();
    }
}
