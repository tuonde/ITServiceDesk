using AutoMapper;
using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Interfaces.Repositories;
using ITServiceDesk.Service.DTOs;
using ITServiceDesk.Service.Interfaces;

namespace ITServiceDesk.Service.Services;

public class TicketCategoryManager : ITicketCategoryService
{
    private readonly ITicketCategoryRepository _repository;
    private readonly IMapper _mapper;

    public TicketCategoryManager(ITicketCategoryRepository repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<IEnumerable<TicketCategoryDto>> GetAllAsync()
    {
        var entities = await _repository.GetAllAsync();
        return _mapper.Map<IEnumerable<TicketCategoryDto>>(entities);
    }

    public async Task<TicketCategoryDto?> GetByIdAsync(Guid id)
    {
        var entity = await _repository.GetByIdAsync(id);
        return entity == null ? null : _mapper.Map<TicketCategoryDto>(entity);
    }

    public async Task<TicketCategoryDto> CreateAsync(TicketCategoryCreateDto dto)
    {
        var entity = _mapper.Map<TicketCategory>(dto);
        await _repository.AddAsync(entity);
        await _repository.SaveChangesAsync();
        return _mapper.Map<TicketCategoryDto>(entity);
    }

    public async Task<TicketCategoryDto> UpdateAsync(TicketCategoryUpdateDto dto)
    {
        var entity = await _repository.GetByIdAsync(dto.Id);
        if (entity == null)
            throw new Exception("Category not found");

        _mapper.Map(dto, entity);
        _repository.Update(entity);
        await _repository.SaveChangesAsync();
        return _mapper.Map<TicketCategoryDto>(entity);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var entity = await _repository.GetByIdAsync(id);
        if (entity == null)
            return false;

        _repository.Remove(entity);
        await _repository.SaveChangesAsync();
        return true;
    }
}
