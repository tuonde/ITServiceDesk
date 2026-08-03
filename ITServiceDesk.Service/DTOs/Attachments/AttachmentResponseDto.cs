namespace ITServiceDesk.Service.DTOs.Attachments;

public class AttachmentResponseDto
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public Guid? TicketId { get; set; }
    public Guid? CommentId { get; set; }
    public Guid? UploaderId { get; set; }
    public string UploaderName { get; set; } = string.Empty;
    public string UploaderRole { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
