using ITServiceDesk.Core.Enums;

namespace ITServiceDesk.Core.Entities;

public class KbArticle : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public int ViewCount { get; set; } = 0;
    
    public KbArticleVisibility Visibility { get; set; } = KbArticleVisibility.Both;
    public KbArticleStatus Status { get; set; } = KbArticleStatus.Draft;
    public KbArticleType ArticleType { get; set; } = KbArticleType.FAQ;
    
    // Navigation Properties
    public Guid CategoryId { get; set; }
    public KbCategory? Category { get; set; }
    
    public Guid AuthorId { get; set; }
    public AppUser? Author { get; set; }
    
    public ICollection<KbArticleFeedback> Feedbacks { get; set; } = [];
    public ICollection<Attachment> Attachments { get; set; } = [];
}
