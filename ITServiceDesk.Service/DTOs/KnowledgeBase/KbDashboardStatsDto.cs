namespace ITServiceDesk.Service.DTOs.KnowledgeBase;

public class KbDashboardStatsDto
{
    public int TotalArticles { get; set; }
    public int PublishedCount { get; set; }
    public int DraftCount { get; set; }
    public int ArchivedCount { get; set; }
    public int TotalViews { get; set; }
    
    // Most viewed
    public IEnumerable<KbArticleResponseDto> MostViewedArticles { get; set; } = new List<KbArticleResponseDto>();
    public IEnumerable<KbArticleResponseDto> RecentlyAddedArticles { get; set; } = new List<KbArticleResponseDto>();
}
