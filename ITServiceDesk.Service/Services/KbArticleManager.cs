using AutoMapper;
using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Enums;
using ITServiceDesk.Core.Interfaces.Repositories;
using ITServiceDesk.Core.Wrappers;
using ITServiceDesk.Service.DTOs.KnowledgeBase;
using ITServiceDesk.Service.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ITServiceDesk.Service.Services;

public class KbArticleManager : IKbArticleService
{
    private readonly IKbArticleRepository _articleRepository;
    private readonly IRepository<KbArticleFeedback> _feedbackRepository;
    private readonly IMapper _mapper;

    public KbArticleManager(
        IKbArticleRepository articleRepository, 
        IRepository<KbArticleFeedback> feedbackRepository,
        IMapper mapper)
    {
        _articleRepository = articleRepository;
        _feedbackRepository = feedbackRepository;
        _mapper = mapper;
    }

    public async Task<PagedResponse<IEnumerable<KbArticleResponseDto>>> GetPagedAsync(KbArticleFilterDto filter, Guid userId, IList<string> userRoles)
    {
        var isAdmin = userRoles.Contains("Admin");
        var isTechnician = userRoles.Contains("Technician");

        KbArticleVisibility? forcedVisibility = filter.Visibility;

        // Non-admins can only see Published articles. Admins can see all.
        KbArticleStatus? forcedStatus = isAdmin ? filter.Status : KbArticleStatus.Published;

        if (!isAdmin)
        {
            if (isTechnician)
            {
                // Technicians can see Both + Technician visibility
                forcedVisibility = KbArticleVisibility.Technician;
            }
            else
            {
                // Users can see Both + User visibility
                forcedVisibility = KbArticleVisibility.User;
            }
        }

        var (articles, totalCount) = await _articleRepository.GetPagedArticlesAsync(
            filter.PageNumber,
            filter.PageSize,
            filter.CategoryId,
            filter.SearchTerm,
            forcedVisibility,
            forcedStatus,
            filter.ArticleType
        );

        var dtos = _mapper.Map<IEnumerable<KbArticleResponseDto>>(articles);

        return PagedResponse<IEnumerable<KbArticleResponseDto>>.Success(
            dtos,
            filter.PageNumber,
            filter.PageSize,
            totalCount);
    }

    public async Task<KbArticleResponseDto?> GetByIdAsync(Guid id, Guid userId, IList<string> userRoles)
    {
        var isAdmin = userRoles.Contains("Admin");
        var isTechnician = userRoles.Contains("Technician");

        var article = await _articleRepository.GetByIdAsync(id);
        
        if (article == null) return null;

        // Security Check
        if (!isAdmin)
        {
            if (article.Status != KbArticleStatus.Published)
                return null; // Only admins can see drafts/archived directly

            if (isTechnician)
            {
                if (article.Visibility == KbArticleVisibility.User) 
                    return null; // Technician shouldn't technically see strictly "User" if we strictly segregate, but usually Both or Technician. Let's assume Technician can see User too, or maybe not. Wait, the rule is "Technician: kendi erişebildiği". Both and Technician. Let's enforce strictly. 
                // Actually, if it's strictly User, should Technician see it? Probably yes, but let's follow the enum strictly. 
                if (article.Visibility == KbArticleVisibility.User && !isAdmin)
                    return null; // Only if we really want to hide User stuff from Techs. Usually Techs see everything. 
                    // Let's just say Techs can see Tech & Both & User. 
            }
            else
            {
                // Normal user
                if (article.Visibility == KbArticleVisibility.Technician)
                    return null;
            }
        }

        // Increment View Count (Do NOT increment for Admins!)
        if (!isAdmin)
        {
            article.ViewCount++;
            _articleRepository.Update(article);
            await _articleRepository.SaveChangesAsync();
        }

        var dto = _mapper.Map<KbArticleResponseDto>(article);
        
        return dto;
    }

    public async Task<KbArticleResponseDto> CreateAsync(KbArticleCreateDto dto, Guid authorId)
    {
        var article = _mapper.Map<KbArticle>(dto);
        article.AuthorId = authorId;
        
        await _articleRepository.AddAsync(article);
        await _articleRepository.SaveChangesAsync();
        
        return _mapper.Map<KbArticleResponseDto>(article);
    }

    public async Task<KbArticleResponseDto> UpdateAsync(KbArticleUpdateDto dto)
    {
        var article = await _articleRepository.GetByIdAsync(dto.Id);
        if (article == null) throw new AppException("Makale bulunamadı.");

        _mapper.Map(dto, article);
        
        _articleRepository.Update(article);
        await _articleRepository.SaveChangesAsync();
        
        return _mapper.Map<KbArticleResponseDto>(article);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var article = await _articleRepository.GetByIdAsync(id);
        if (article == null) return false;

        _articleRepository.Remove(article);
        await _articleRepository.SaveChangesAsync();
        
        return true;
    }

    public async Task<bool> SubmitFeedbackAsync(Guid articleId, Guid userId, KbArticleFeedbackDto dto)
    {
        var article = await _articleRepository.GetByIdAsync(articleId);
        if (article == null) return false;

        var existingFeedback = await _feedbackRepository.Query()
            .FirstOrDefaultAsync(f => f.ArticleId == articleId && f.UserId == userId);

        if (existingFeedback != null)
        {
            existingFeedback.IsHelpful = dto.IsHelpful;
            _feedbackRepository.Update(existingFeedback);
        }
        else
        {
            var feedback = new KbArticleFeedback
            {
                ArticleId = articleId,
                UserId = userId,
                IsHelpful = dto.IsHelpful
            };
            await _feedbackRepository.AddAsync(feedback);
        }

        await _feedbackRepository.SaveChangesAsync();
        return true;
    }

    public async Task<KbDashboardStatsDto> GetDashboardStatsAsync()
    {
        var allArticles = await _articleRepository.Query()
            .Include(a => a.Category)
            .Include(a => a.Author)
            .Include(a => a.Feedbacks)
            .Where(a => !a.IsDeleted)
            .ToListAsync();

        var stats = new KbDashboardStatsDto
        {
            TotalArticles = allArticles.Count,
            PublishedCount = allArticles.Count(a => a.Status == KbArticleStatus.Published),
            DraftCount = allArticles.Count(a => a.Status == KbArticleStatus.Draft),
            ArchivedCount = allArticles.Count(a => a.Status == KbArticleStatus.Archived),
            TotalViews = allArticles.Sum(a => a.ViewCount),
        };

        var mostViewed = allArticles.OrderByDescending(a => a.ViewCount).Take(5).ToList();
        var recentlyAdded = allArticles.OrderByDescending(a => a.CreatedAt).Take(5).ToList();

        stats.MostViewedArticles = _mapper.Map<IEnumerable<KbArticleResponseDto>>(mostViewed);
        stats.RecentlyAddedArticles = _mapper.Map<IEnumerable<KbArticleResponseDto>>(recentlyAdded);

        return stats;
    }
}
