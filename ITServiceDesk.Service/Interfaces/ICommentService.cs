using ITServiceDesk.Service.DTOs.Comments;

namespace ITServiceDesk.Service.Interfaces;

public interface ICommentService
{
    Task<IEnumerable<CommentResponseDto>> GetAllByTicketIdAsync(Guid ticketId, bool isInternalViewer);
    Task<CommentResponseDto> CreateAsync(CommentCreateDto dto);
    Task<CommentResponseDto> UpdateAsync(Guid id, CommentUpdateDto dto);
    Task<bool> DeleteAsync(Guid id);
}
