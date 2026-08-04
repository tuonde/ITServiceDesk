namespace ITServiceDesk.Service.DTOs.Comments;

public class CommentCreateDto
{
    public string Content { get; set; } = string.Empty;
    public Guid TicketId { get; set; }
    public Guid UserId { get; set; }
    public bool IsInternal { get; set; }
}
