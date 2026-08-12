namespace ITServiceDesk.Core.Entities;

public class KbCategory : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public int Order { get; set; }
    
    // Navigation Properties
    public ICollection<KbArticle> Articles { get; set; } = [];
}
