using ITServiceDesk.Core.Entities;
using ITServiceDesk.Data.Contexts;
using ITServiceDesk.Service.DTOs.Devices;
using ITServiceDesk.Service.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ITServiceDesk.Service.Services;

public class DeviceManager : IDeviceService
{
    private readonly ITServiceDeskDbContext _context;

    public DeviceManager(ITServiceDeskDbContext context)
    {
        _context = context;
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
            .Include(d => d.Category)
            .Include(d => d.Department)
            .Where(d => !d.IsDeleted)
            .OrderBy(d => d.Code)
            .Select(d => new DeviceDto
            {
                Id = d.Id,
                Code = d.Code,
                Name = d.Name,
                Status = d.Status,
                CategoryId = d.CategoryId,
                CategoryName = d.Category != null ? d.Category.Name : null,
                DepartmentId = d.DepartmentId,
                DepartmentName = d.Department != null ? d.Department.Name : null,
                AssignedUserId = d.AssignedUserId,
                AssignedUserName = d.AssignedUser != null ? d.AssignedUser.FirstName + " " + d.AssignedUser.LastName : null
            })
            .ToListAsync();
    }

    public async Task<IEnumerable<DeviceDto>> GetAvailableForUserAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        var departmentId = user?.DepartmentId;

        return await _context.Devices
            .Include(d => d.Category)
            .Include(d => d.Department)
            .Include(d => d.AssignedUser)
            .Where(d => !d.IsDeleted && (d.AssignedUserId == userId || (d.AssignedUserId == null && d.DepartmentId == departmentId)))
            .OrderBy(d => d.Code)
            .Select(d => new DeviceDto
            {
                Id = d.Id,
                Code = d.Code,
                Name = d.Name,
                Status = d.Status,
                CategoryId = d.CategoryId,
                CategoryName = d.Category != null ? d.Category.Name : null,
                DepartmentId = d.DepartmentId,
                DepartmentName = d.Department != null ? d.Department.Name : null,
                AssignedUserId = d.AssignedUserId,
                AssignedUserName = d.AssignedUser != null ? d.AssignedUser.FirstName + " " + d.AssignedUser.LastName : null
            })
            .ToListAsync();
    }
    public async Task<DeviceDto?> GetByIdAsync(Guid id)
    {
        var device = await _context.Devices
            .Include(d => d.Category)
            .Include(d => d.Department)
            .Include(d => d.AssignedUser)
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

        if (device == null) return null;

        return new DeviceDto
        {
            Id = device.Id,
            Code = device.Code,
            Name = device.Name,
            Status = device.Status,
            CategoryId = device.CategoryId,
            CategoryName = device.Category != null ? device.Category.Name : string.Empty,
            DepartmentId = device.DepartmentId,
            DepartmentName = device.Department != null ? device.Department.Name : null,
            AssignedUserId = device.AssignedUserId,
            AssignedUserName = device.AssignedUser != null ? device.AssignedUser.FirstName + " " + device.AssignedUser.LastName : null
        };
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

        return await GetByIdAsync(device.Id) ?? throw new Exception("Cihaz oluşturuldu ancak getirilemedi.");
    }

    public async Task<DeviceDto> UpdateAsync(Guid id, DeviceUpdateDto dto)
    {
        var device = await _context.Devices.FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);
        if (device == null) throw new Exception("Cihaz bulunamadı.");

        device.Code = dto.Code;
        device.Name = dto.Name;
        device.Status = dto.Status;
        device.CategoryId = dto.CategoryId;
        device.DepartmentId = dto.DepartmentId;
        device.AssignedUserId = dto.AssignedUserId;

        await _context.SaveChangesAsync();

        return await GetByIdAsync(device.Id) ?? throw new Exception("Cihaz güncellendi ancak getirilemedi.");
    }

    public async Task DeleteAsync(Guid id)
    {
        var device = await _context.Devices.FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);
        if (device == null) throw new Exception("Cihaz bulunamadı.");

        device.IsDeleted = true;
        await _context.SaveChangesAsync();
    }
}
