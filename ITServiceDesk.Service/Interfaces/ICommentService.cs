using ITServiceDesk.Service.DTOs.Comments;

namespace ITServiceDesk.Service.Interfaces;

public interface ICommentService
{
    Task<IEnumerable<CommentResponseDto>> GetAllByTicketIdAsync(Guid ticketId, Guid currentUserId, IList<string> userRoles);
    Task<CommentResponseDto> CreateAsync(CommentCreateDto dto, Guid currentUserId, IList<string> userRoles);
    Task<CommentResponseDto> UpdateAsync(Guid id, CommentUpdateDto dto, Guid userId, bool isAdmin);
    Task<bool> DeleteAsync(Guid id, Guid userId, bool isAdmin);
}
