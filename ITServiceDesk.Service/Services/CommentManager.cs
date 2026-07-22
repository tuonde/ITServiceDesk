using AutoMapper;
using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Interfaces.Repositories;
using ITServiceDesk.Service.DTOs.Comments;
using ITServiceDesk.Service.Interfaces;

namespace ITServiceDesk.Service.Services;

public class CommentManager : ICommentService
{
    private readonly IRepository<Comment> _repository;
    private readonly IMapper _mapper;

    public CommentManager(IRepository<Comment> repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<IEnumerable<CommentResponseDto>> GetAllByTicketIdAsync(Guid ticketId)
    {
        var all = await _repository.GetAllAsync();
        var comments = all.Where(x => x.TicketId == ticketId);
        return _mapper.Map<IEnumerable<CommentResponseDto>>(comments);
    }

    public async Task<CommentResponseDto> CreateAsync(CommentCreateDto dto)
    {
        var comment = _mapper.Map<Comment>(dto);
        await _repository.AddAsync(comment);
        await _repository.SaveChangesAsync();
        return _mapper.Map<CommentResponseDto>(comment);
    }

    public async Task<CommentResponseDto> UpdateAsync(Guid id, CommentUpdateDto dto)
    {
        var comment = await _repository.GetByIdAsync(id);
        if (comment == null) throw new Exception("Yorum bulunamadı");
        
        _mapper.Map(dto, comment);
        _repository.Update(comment);
        await _repository.SaveChangesAsync();
        return _mapper.Map<CommentResponseDto>(comment);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var comment = await _repository.GetByIdAsync(id);
        if (comment == null) return false;
        
        _repository.Remove(comment);
        await _repository.SaveChangesAsync();
        return true;
    }
}
