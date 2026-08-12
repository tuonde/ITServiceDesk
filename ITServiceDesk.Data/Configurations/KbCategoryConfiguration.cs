using ITServiceDesk.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ITServiceDesk.Data.Configurations;

public class KbCategoryConfiguration : IEntityTypeConfiguration<KbCategory>
{
    public void Configure(EntityTypeBuilder<KbCategory> builder)
    {
        builder.HasKey(c => c.Id);
        
        builder.Property(c => c.Name).IsRequired().HasMaxLength(100);
        builder.Property(c => c.Description).HasMaxLength(500);
        builder.Property(c => c.Icon).HasMaxLength(50);
        
        builder.HasQueryFilter(c => !c.IsDeleted);
    }
}
