using AutoMapper;
using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Interfaces.Repositories;
using ITServiceDesk.Service.DTOs;
using ITServiceDesk.Service.Interfaces;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace ITServiceDesk.Service.Services;

public class DepartmentManager : IDepartmentService
{
    private readonly IRepository<Department> _departmentRepository;
    private readonly IMapper _mapper;
    private readonly ILogger<DepartmentManager> _logger;
    private readonly IMemoryCache _memoryCache;
    
    private const string CacheKey = "DepartmentsList";

    public DepartmentManager(
        IRepository<Department> departmentRepository, 
        IMapper mapper, 
        ILogger<DepartmentManager> logger,
        IMemoryCache memoryCache)
    {
        _departmentRepository = departmentRepository;
        _mapper = mapper;
        _logger = logger;
        _memoryCache = memoryCache;
    }

    public async Task<IEnumerable<DepartmentResponseDto>> GetAllAsync()
    {
        return await _memoryCache.GetOrCreateAsync(CacheKey, async entry =>
        {
            _logger.LogInformation("Departmanlar veritabanından çekiliyor ve önbelleğe alınıyor...");
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(60);
            
            var list = await _departmentRepository.GetAllAsync();
            return _mapper.Map<IEnumerable<DepartmentResponseDto>>(list);
        }) ?? [];
    }

    public async Task<DepartmentResponseDto?> GetByIdAsync(Guid id)
    {
        var dept = await _departmentRepository.GetByIdAsync(id);
        return dept == null ? null : _mapper.Map<DepartmentResponseDto>(dept);
    }

    public async Task<DepartmentResponseDto> CreateAsync(DepartmentCreateDto dto)
    {
        var department = _mapper.Map<Department>(dto);
        await _departmentRepository.AddAsync(department);
        await _departmentRepository.SaveChangesAsync();
        
        _memoryCache.Remove(CacheKey);
        
        return _mapper.Map<DepartmentResponseDto>(department);
    }

    public async Task<DepartmentResponseDto> UpdateAsync(Guid id, DepartmentCreateDto dto)
    {
        var dept = await _departmentRepository.GetByIdAsync(id);
        if (dept == null) throw new AppException("Not found");
        
        _mapper.Map(dto, dept);
        _departmentRepository.Update(dept);
        await _departmentRepository.SaveChangesAsync();
        
        _memoryCache.Remove(CacheKey);
        
        return _mapper.Map<DepartmentResponseDto>(dept);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var dept = await _departmentRepository.GetByIdAsync(id);
        if (dept == null) return false;
        
        _departmentRepository.Remove(dept);
        await _departmentRepository.SaveChangesAsync();
        
        _memoryCache.Remove(CacheKey);
        
        return true;
    }
}
