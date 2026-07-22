using ITServiceDesk.Service.DTOs.Attachments;

namespace ITServiceDesk.Service.Interfaces;

public interface IAttachmentService
{
    Task<IEnumerable<AttachmentResponseDto>> GetByTicketIdAsync(Guid ticketId);
    Task<AttachmentResponseDto> UploadAsync(AttachmentCreateDto dto);
    Task<bool> DeleteAsync(Guid id);
}
