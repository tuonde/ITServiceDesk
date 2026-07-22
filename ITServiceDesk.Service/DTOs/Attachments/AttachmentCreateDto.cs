using Microsoft.AspNetCore.Http;

namespace ITServiceDesk.Service.DTOs.Attachments;

public class AttachmentCreateDto
{
    public IFormFile File { get; set; } = null!;
    public Guid? TicketId { get; set; }
    public Guid? CommentId { get; set; }
}
