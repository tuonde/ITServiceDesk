using AutoMapper;
using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Interfaces.Repositories;
using ITServiceDesk.Service.DTOs.Attachments;
using ITServiceDesk.Service.Interfaces;

namespace ITServiceDesk.Service.Services;

public class AttachmentManager : IAttachmentService
{
    private readonly IRepository<Attachment> _repository;
    private readonly IMapper _mapper;

    public AttachmentManager(IRepository<Attachment> repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<IEnumerable<AttachmentResponseDto>> GetByTicketIdAsync(Guid ticketId)
    {
        var all = await _repository.GetAllAsync();
        var attachments = all.Where(x => x.TicketId == ticketId);
        return _mapper.Map<IEnumerable<AttachmentResponseDto>>(attachments);
    }

    public async Task<AttachmentResponseDto> UploadAsync(AttachmentCreateDto dto)
    {
        var attachment = new Attachment
        {
            FileName = dto.File.FileName,
            ContentType = dto.File.ContentType,
            FileSize = dto.File.Length,
            FilePath = "/uploads/" + dto.File.FileName,
            TicketId = dto.TicketId,
            CommentId = dto.CommentId
        };
        await _repository.AddAsync(attachment);
        await _repository.SaveChangesAsync();
        return _mapper.Map<AttachmentResponseDto>(attachment);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var attachment = await _repository.GetByIdAsync(id);
        if (attachment == null) return false;
        
        _repository.Remove(attachment);
        await _repository.SaveChangesAsync();
        return true;
    }
}
