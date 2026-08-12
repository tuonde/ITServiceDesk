using ITServiceDesk.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ITServiceDesk.Data.Configurations;

public class KbArticleFeedbackConfiguration : IEntityTypeConfiguration<KbArticleFeedback>
{
    public void Configure(EntityTypeBuilder<KbArticleFeedback> builder)
    {
        builder.HasKey(f => f.Id);
        
        // UNIQUE constraint per user per article
        builder.HasIndex(f => new { f.ArticleId, f.UserId }).IsUnique();

        builder.HasOne(f => f.Article)
            .WithMany(a => a.Feedbacks)
            .HasForeignKey(f => f.ArticleId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(f => f.User)
            .WithMany()
            .HasForeignKey(f => f.UserId)
            .OnDelete(DeleteBehavior.Restrict);
            
        builder.HasQueryFilter(f => !f.IsDeleted);
    }
}
