using ITServiceDesk.Core.Enums;

namespace ITServiceDesk.Service.DTOs.KnowledgeBase;

public class KbArticleResponseDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public int ViewCount { get; set; }
    public KbArticleVisibility Visibility { get; set; }
    public KbArticleStatus Status { get; set; }
    public KbArticleType ArticleType { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    
    public Guid CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    
    public Guid AuthorId { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    
    // Feedback summaries
    public int HelpfulCount { get; set; }
    public int NotHelpfulCount { get; set; }
}

public class KbArticleCreateDto
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public KbArticleVisibility Visibility { get; set; }
    public KbArticleStatus Status { get; set; }
    public KbArticleType ArticleType { get; set; }
    public Guid CategoryId { get; set; }
}

public class KbArticleUpdateDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public KbArticleVisibility Visibility { get; set; }
    public KbArticleStatus Status { get; set; }
    public KbArticleType ArticleType { get; set; }
    public Guid CategoryId { get; set; }
}

public class KbArticleFilterDto
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public Guid? CategoryId { get; set; }
    public string? SearchTerm { get; set; }
    public KbArticleVisibility? Visibility { get; set; }
    public KbArticleStatus? Status { get; set; }
    public KbArticleType? ArticleType { get; set; }
}
