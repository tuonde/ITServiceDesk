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
            PasswordRequireUppercase = settings.PasswordRequireUppercase,
            SlaCriticalResponseHours = settings.SlaCriticalResponseHours,
            SlaCriticalResolutionHours = settings.SlaCriticalResolutionHours,
            SlaHighResponseHours = settings.SlaHighResponseHours,
            SlaHighResolutionHours = settings.SlaHighResolutionHours,
            SlaMediumResponseHours = settings.SlaMediumResponseHours,
            SlaMediumResolutionHours = settings.SlaMediumResolutionHours,
            SlaLowResponseHours = settings.SlaLowResponseHours,
            SlaLowResolutionHours = settings.SlaLowResolutionHours
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
        
        settings.SlaCriticalResponseHours = dto.SlaCriticalResponseHours;
        settings.SlaCriticalResolutionHours = dto.SlaCriticalResolutionHours;
        settings.SlaHighResponseHours = dto.SlaHighResponseHours;
        settings.SlaHighResolutionHours = dto.SlaHighResolutionHours;
        settings.SlaMediumResponseHours = dto.SlaMediumResponseHours;
        settings.SlaMediumResolutionHours = dto.SlaMediumResolutionHours;
        settings.SlaLowResponseHours = dto.SlaLowResponseHours;
        settings.SlaLowResolutionHours = dto.SlaLowResolutionHours;

        await _context.SaveChangesAsync();
    }
}
