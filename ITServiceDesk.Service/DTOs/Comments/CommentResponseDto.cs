namespace ITServiceDesk.Service.DTOs.Comments;

public class CommentResponseDto
{
    public Guid Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public Guid TicketId { get; set; }
    public Guid UserId { get; set; }
    public DateTime CreatedAt { get; set; }
}
