using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Enums;
using ITServiceDesk.Core.Interfaces.Repositories;
using ITServiceDesk.Data.Contexts;
using Microsoft.EntityFrameworkCore;

namespace ITServiceDesk.Data.Repositories;

public class KbArticleRepository : EfRepository<KbArticle>, IKbArticleRepository
{
    private readonly ITServiceDeskDbContext _context;

    public KbArticleRepository(ITServiceDeskDbContext context) : base(context)
    {
        _context = context;
    }

    public async Task<(IEnumerable<KbArticle> Articles, int TotalCount)> GetPagedArticlesAsync(
        int pageNumber, 
        int pageSize, 
        Guid? categoryId, 
        string? searchTerm, 
        KbArticleVisibility? visibility, 
        KbArticleStatus? status,
        KbArticleType? articleType)
    {
        var query = _context.KbArticles
            .Include(a => a.Category)
            .Include(a => a.Author)
            .Include(a => a.Feedbacks)
            .Where(a => !a.IsDeleted)
            .AsQueryable();

        if (categoryId.HasValue)
            query = query.Where(a => a.CategoryId == categoryId.Value);

        if (visibility.HasValue)
        {
            if (visibility.Value == KbArticleVisibility.User)
            {
                query = query.Where(a => a.Visibility == KbArticleVisibility.User || a.Visibility == KbArticleVisibility.Both);
            }
            else if (visibility.Value == KbArticleVisibility.Technician)
            {
                query = query.Where(a => a.Visibility == KbArticleVisibility.Technician || a.Visibility == KbArticleVisibility.Both);
            }
        }

        if (status.HasValue)
            query = query.Where(a => a.Status == status.Value);

        if (articleType.HasValue)
            query = query.Where(a => a.ArticleType == articleType.Value);

        if (!string.IsNullOrWhiteSpace(searchTerm))
            query = query.Where(a => a.Title.Contains(searchTerm) || a.Content.Contains(searchTerm));

        var totalCount = await query.CountAsync();

        var articles = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (articles, totalCount);
    }

    public new async Task<KbArticle?> GetByIdAsync(Guid id)
    {
        return await _context.KbArticles
            .Include(a => a.Category)
            .Include(a => a.Author)
            .Include(a => a.Attachments)
            .Include(a => a.Feedbacks)
            .FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);
    }
}
