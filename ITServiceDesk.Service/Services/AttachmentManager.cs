using AutoMapper;
using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Interfaces.Repositories;
using ITServiceDesk.Service.DTOs.Attachments;
using ITServiceDesk.Service.Interfaces;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;

namespace ITServiceDesk.Service.Services;

public class AttachmentManager : IAttachmentService
{
    private readonly IRepository<Attachment> _repository;
    private readonly IMapper _mapper;
    private readonly IWebHostEnvironment _env;

    public AttachmentManager(IRepository<Attachment> repository, IMapper mapper, IWebHostEnvironment env)
    {
        _repository = repository;
        _mapper = mapper;
        _env = env;
    }

    public async Task<IEnumerable<AttachmentResponseDto>> GetByTicketIdAsync(Guid ticketId)
    {
        var attachments = await _repository.Query()
            .Include(x => x.Uploader)
            .Where(x => x.TicketId == ticketId)
            .ToListAsync();
        return _mapper.Map<IEnumerable<AttachmentResponseDto>>(attachments);
    }

    public async Task<AttachmentResponseDto> UploadAsync(AttachmentCreateDto dto)
    {
        if (dto.File == null || dto.File.Length == 0)
            throw new Exception("Dosya boş olamaz.");

        var uploadsFolder = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads");
        if (!Directory.Exists(uploadsFolder))
            Directory.CreateDirectory(uploadsFolder);

        var uniqueFileName = Guid.NewGuid().ToString() + "_" + dto.File.FileName;
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        using (var fileStream = new FileStream(filePath, FileMode.Create))
        {
            await dto.File.CopyToAsync(fileStream);
        }

        var attachment = new Attachment
        {
            FileName = dto.File.FileName,
            ContentType = dto.File.ContentType,
            FileSize = dto.File.Length,
            FilePath = "/uploads/" + uniqueFileName,
            TicketId = dto.TicketId,
            CommentId = dto.CommentId,
            UploaderId = dto.UploaderId
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
