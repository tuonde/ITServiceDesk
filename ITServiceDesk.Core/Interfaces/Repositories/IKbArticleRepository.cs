using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Enums;

namespace ITServiceDesk.Core.Interfaces.Repositories;

public interface IKbArticleRepository : IRepository<KbArticle>
{
    Task<(IEnumerable<KbArticle> Articles, int TotalCount)> GetPagedArticlesAsync(
        int pageNumber, 
        int pageSize, 
        Guid? categoryId, 
        string? searchTerm, 
        KbArticleVisibility? visibility, 
        KbArticleStatus? status,
        KbArticleType? articleType);
        
    new Task<KbArticle?> GetByIdAsync(Guid id);
}
