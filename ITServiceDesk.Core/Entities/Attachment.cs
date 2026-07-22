namespace ITServiceDesk.Core.Entities;

public class Attachment : BaseEntity
{
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    
    // Navigation Properties
    public Guid? TicketId { get; set; }
    public Ticket? Ticket { get; set; }
    
    public Guid? CommentId { get; set; }
    public Comment? Comment { get; set; }
}
