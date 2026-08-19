using AutoMapper;
using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Interfaces.Repositories;
using ITServiceDesk.Service.DTOs.KnowledgeBase;
using ITServiceDesk.Service.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ITServiceDesk.Service.Services;

public class KbCategoryManager : IKbCategoryService
{
    private readonly IRepository<KbCategory> _categoryRepository;
    private readonly IMapper _mapper;

    public KbCategoryManager(IRepository<KbCategory> categoryRepository, IMapper mapper)
    {
        _categoryRepository = categoryRepository;
        _mapper = mapper;
    }

    public async Task<IEnumerable<KbCategoryResponseDto>> GetAllAsync()
    {
        var categories = await _categoryRepository.Query()
            .Where(c => !c.IsDeleted)
            .OrderBy(c => c.Order)
            .ToListAsync();
            
        return _mapper.Map<IEnumerable<KbCategoryResponseDto>>(categories);
    }

    public async Task<KbCategoryResponseDto?> GetByIdAsync(Guid id)
    {
        var category = await _categoryRepository.GetByIdAsync(id);
        return category == null ? null : _mapper.Map<KbCategoryResponseDto>(category);
    }

    public async Task<KbCategoryResponseDto> CreateAsync(KbCategoryCreateDto dto)
    {
        var category = _mapper.Map<KbCategory>(dto);
        await _categoryRepository.AddAsync(category);
        await _categoryRepository.SaveChangesAsync();
        
        return _mapper.Map<KbCategoryResponseDto>(category);
    }

    public async Task<KbCategoryResponseDto> UpdateAsync(KbCategoryUpdateDto dto)
    {
        var category = await _categoryRepository.GetByIdAsync(dto.Id);
        if (category == null) throw new AppException("Kategori bulunamadı.");

        _mapper.Map(dto, category);
        
        _categoryRepository.Update(category);
        await _categoryRepository.SaveChangesAsync();
        
        return _mapper.Map<KbCategoryResponseDto>(category);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var category = await _categoryRepository.GetByIdAsync(id);
        if (category == null) return false;

        _categoryRepository.Remove(category);
        await _categoryRepository.SaveChangesAsync();
        
        return true;
    }
}
