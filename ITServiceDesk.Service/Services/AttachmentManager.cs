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
            .AsNoTracking()
            .ToListAsync();
        return _mapper.Map<IEnumerable<AttachmentResponseDto>>(attachments);
    }

    public async Task<AttachmentResponseDto> GetByIdAsync(Guid id)
    {
        var attachment = await _repository.Query()
            .Include(x => x.Uploader)
            .FirstOrDefaultAsync(x => x.Id == id);
            
        if (attachment == null) return null;
        
        return _mapper.Map<AttachmentResponseDto>(attachment);
    }

    public async Task<AttachmentResponseDto> UploadAsync(AttachmentCreateDto dto)
    {
        if (dto.File == null || dto.File.Length == 0)
            throw new AppException("Dosya boş olamaz.");

        // Maksimum dosya boyutu (10 MB)
        if (dto.File.Length > 10 * 1024 * 1024)
            throw new AppException("Dosya boyutu 10 MB'ı geçemez.");

        // Güvenli dosya uzantıları (Whitelist)
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt" };
        var extension = Path.GetExtension(dto.File.FileName).ToLowerInvariant();
        if (string.IsNullOrEmpty(extension) || !allowedExtensions.Contains(extension))
            throw new AppException("Desteklenmeyen dosya formatı. Sadece resim, belge ve PDF dosyaları yüklenebilir.");

        // MIME Spoofing Koruması (Magic Number Validation)
        if (!await IsValidFileSignature(dto.File, extension))
            throw new AppException("Dosya içeriği ile uzantısı uyuşmuyor (Sahte dosya tespiti).");

        var appDataFolder = Path.Combine(Directory.GetCurrentDirectory(), "App_Data", "uploads");
        if (!Directory.Exists(appDataFolder))
            Directory.CreateDirectory(appDataFolder);

        var uniqueFileName = Guid.NewGuid().ToString() + extension;
        var filePath = Path.Combine(appDataFolder, uniqueFileName);

        using (var fileStream = new FileStream(filePath, FileMode.Create))
        {
            await dto.File.CopyToAsync(fileStream);
        }

        var attachment = new Attachment
        {
            FileName = Path.GetFileName(dto.File.FileName),
            ContentType = dto.File.ContentType,
            FileSize = dto.File.Length,
            FilePath = uniqueFileName, // Sadece dosya adı tutulur
            TicketId = dto.TicketId,
            CommentId = dto.CommentId,
            UploaderId = dto.UploaderId
        };
        await _repository.AddAsync(attachment);
        await _repository.SaveChangesAsync();
        
        var uploadedAttachment = await _repository.Query()
            .Include(a => a.Uploader)
            .FirstOrDefaultAsync(a => a.Id == attachment.Id);

        return _mapper.Map<AttachmentResponseDto>(uploadedAttachment ?? attachment);
    }

    private async Task<bool> IsValidFileSignature(Microsoft.AspNetCore.Http.IFormFile file, string extension)
    {
        using var reader = new BinaryReader(file.OpenReadStream());
        var signatures = new Dictionary<string, List<byte[]>>
        {
            { ".jpg", new List<byte[]> { new byte[] { 0xFF, 0xD8, 0xFF } } },
            { ".jpeg", new List<byte[]> { new byte[] { 0xFF, 0xD8, 0xFF } } },
            { ".png", new List<byte[]> { new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A } } },
            { ".pdf", new List<byte[]> { new byte[] { 0x25, 0x50, 0x44, 0x46 } } }
        };

        if (signatures.ContainsKey(extension))
        {
            var headerBytes = reader.ReadBytes(signatures[extension].Max(m => m.Length));
            bool isMatch = signatures[extension].Any(signature => headerBytes.Take(signature.Length).SequenceEqual(signature));
            if (!isMatch) return false;
        }
        
        // Text tabanlı veya karmaşık Office dosyaları (.docx, .txt) için bu aşamada true dönüyoruz.
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId, bool isAdmin)
    {
        var attachment = await _repository.GetByIdAsync(id);
        if (attachment == null) return false;
        
        if (!isAdmin && attachment.UploaderId != userId)
            throw new UnauthorizedAccessException("Bu dosyayı silme yetkiniz yok.");

        _repository.Remove(attachment);
        await _repository.SaveChangesAsync();
        return true;
    }
}
