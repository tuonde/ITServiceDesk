namespace ITServiceDesk.Core.Entities;

public class KbArticleFeedback : BaseEntity
{
    public bool IsHelpful { get; set; }
    
    // Navigation Properties
    public Guid ArticleId { get; set; }
    public KbArticle? Article { get; set; }
    
    public Guid UserId { get; set; }
    public AppUser? User { get; set; }
}
