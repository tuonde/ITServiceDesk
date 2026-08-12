using ITServiceDesk.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ITServiceDesk.Data.Configurations;

public class KbArticleConfiguration : IEntityTypeConfiguration<KbArticle>
{
    public void Configure(EntityTypeBuilder<KbArticle> builder)
    {
        builder.HasKey(a => a.Id);
        
        builder.Property(a => a.Title).IsRequired().HasMaxLength(200);
        builder.Property(a => a.Content).IsRequired(); // typically Max or no length limit needed for nvarchar(max)
        
        builder.HasOne(a => a.Category)
            .WithMany(c => c.Articles)
            .HasForeignKey(a => a.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(a => a.Author)
            .WithMany()
            .HasForeignKey(a => a.AuthorId)
            .OnDelete(DeleteBehavior.Restrict);
            
        builder.HasQueryFilter(a => !a.IsDeleted);
    }
}
