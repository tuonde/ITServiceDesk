using ITServiceDesk.Service.DTOs.Settings;
using System.Threading.Tasks;

namespace ITServiceDesk.Service.Interfaces;

public interface ISystemSettingsService
{
    Task<SystemSettingsDto> GetSettingsAsync();
    Task UpdateSettingsAsync(SystemSettingsDto dto);
}
