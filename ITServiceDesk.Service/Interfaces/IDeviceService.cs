using ITServiceDesk.Service.DTOs.Devices;

namespace ITServiceDesk.Service.Interfaces;

public interface IDeviceService
{
    // Device Category Operations
    Task<IEnumerable<DeviceCategoryDto>> GetCategoriesAsync();
    Task<DeviceCategoryDto> CreateCategoryAsync(string name, string? description);
    
    // Device Operations
    Task<IEnumerable<DeviceDto>> GetAllAsync();
    Task<DeviceDto?> GetByIdAsync(Guid id);
    Task<DeviceDto> CreateAsync(DeviceCreateDto dto);
    Task<DeviceDto> UpdateAsync(Guid id, DeviceUpdateDto dto);
    Task DeleteAsync(Guid id);
}
