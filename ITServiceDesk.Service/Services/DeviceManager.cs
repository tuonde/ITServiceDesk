using ITServiceDesk.Core.Entities;
using ITServiceDesk.Data.Contexts;
using ITServiceDesk.Service.DTOs.Devices;
using ITServiceDesk.Service.Interfaces;
using Microsoft.EntityFrameworkCore;

using AutoMapper;
using AutoMapper.QueryableExtensions;

namespace ITServiceDesk.Service.Services;

public class DeviceManager : IDeviceService
{
    private readonly ITServiceDeskDbContext _context;
    private readonly IMapper _mapper;

    public DeviceManager(ITServiceDeskDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<IEnumerable<DeviceCategoryDto>> GetCategoriesAsync()
    {
        return await _context.DeviceCategories
            .Where(c => !c.IsDeleted)
            .OrderBy(c => c.Name)
            .Select(c => new DeviceCategoryDto
            {
                Id = c.Id,
                Name = c.Name,
                Description = c.Description
            })
            .ToListAsync();
    }

    public async Task<DeviceCategoryDto> CreateCategoryAsync(string name, string? description)
    {
        var category = new DeviceCategory
        {
            Name = name,
            Description = description
        };

        _context.DeviceCategories.Add(category);
        await _context.SaveChangesAsync();

        return new DeviceCategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            Description = category.Description
        };
    }

    public async Task<IEnumerable<DeviceDto>> GetAllAsync()
    {
        return await _context.Devices
            .Where(d => !d.IsDeleted)
            .OrderBy(d => d.Code)
            .ProjectTo<DeviceDto>(_mapper.ConfigurationProvider)
            .ToListAsync();
    }

    public async Task<IEnumerable<DeviceDto>> GetAvailableForUserAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        var departmentId = user?.DepartmentId;

        return await _context.Devices
            .Where(d => !d.IsDeleted && (d.AssignedUserId == userId || (d.AssignedUserId == null && d.DepartmentId == departmentId)))
            .OrderBy(d => d.Code)
            .ProjectTo<DeviceDto>(_mapper.ConfigurationProvider)
            .ToListAsync();
    }
    public async Task<DeviceDto?> GetByIdAsync(Guid id)
    {
        var device = await _context.Devices
            .Where(d => d.Id == id && !d.IsDeleted)
            .ProjectTo<DeviceDto>(_mapper.ConfigurationProvider)
            .FirstOrDefaultAsync();

        return device;
    }

    public async Task<DeviceDto> CreateAsync(DeviceCreateDto dto)
    {
        var device = new Device
        {
            Code = dto.Code,
            Name = dto.Name,
            Status = dto.Status,
            CategoryId = dto.CategoryId,
            DepartmentId = dto.DepartmentId,
            AssignedUserId = dto.AssignedUserId
        };

        _context.Devices.Add(device);
        await _context.SaveChangesAsync();

        return await GetByIdAsync(device.Id) ?? throw new AppException("Cihaz oluşturuldu ancak getirilemedi.");
    }

    public async Task<DeviceDto> UpdateAsync(Guid id, DeviceUpdateDto dto)
    {
        var device = await _context.Devices.FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);
        if (device == null) throw new AppException("Cihaz bulunamadı.");

        device.Code = dto.Code;
        device.Name = dto.Name;
        device.Status = dto.Status;
        device.CategoryId = dto.CategoryId;
        device.DepartmentId = dto.DepartmentId;
        device.AssignedUserId = dto.AssignedUserId;

        await _context.SaveChangesAsync();

        return await GetByIdAsync(device.Id) ?? throw new AppException("Cihaz güncellendi ancak getirilemedi.");
    }

    public async Task DeleteAsync(Guid id)
    {
        var device = await _context.Devices.FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);
        if (device == null) throw new AppException("Cihaz bulunamadı.");

        device.IsDeleted = true;
        await _context.SaveChangesAsync();
    }
}
