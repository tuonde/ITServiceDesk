using ITServiceDesk.Core.Wrappers;
using ITServiceDesk.Service.DTOs.KnowledgeBase;

namespace ITServiceDesk.Service.Interfaces;

public interface IKbArticleService
{
    Task<PagedResponse<IEnumerable<KbArticleResponseDto>>> GetPagedAsync(KbArticleFilterDto filter, Guid userId, IList<string> userRoles);
    Task<KbArticleResponseDto?> GetByIdAsync(Guid id, Guid userId, IList<string> userRoles);
    Task<KbArticleResponseDto> CreateAsync(KbArticleCreateDto dto, Guid authorId);
    Task<KbArticleResponseDto> UpdateAsync(KbArticleUpdateDto dto);
    Task<bool> DeleteAsync(Guid id);
    Task<bool> SubmitFeedbackAsync(Guid articleId, Guid userId, KbArticleFeedbackDto dto);
    Task<KbDashboardStatsDto> GetDashboardStatsAsync();
}
