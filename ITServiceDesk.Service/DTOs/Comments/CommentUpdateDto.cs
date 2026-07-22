namespace ITServiceDesk.Service.DTOs.Comments;

public class CommentUpdateDto
{
    public Guid Id { get; set; }
    public string Content { get; set; } = string.Empty;
}
