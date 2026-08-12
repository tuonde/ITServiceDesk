using ITServiceDesk.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ITServiceDesk.Data.Configurations;

public class AttachmentConfiguration : IEntityTypeConfiguration<Attachment>
{
    public void Configure(EntityTypeBuilder<Attachment> builder)
    {
        builder.HasKey(a => a.Id);
        builder.Property(a => a.FileName).IsRequired().HasMaxLength(255);
        builder.Property(a => a.FilePath).IsRequired().HasMaxLength(1000);
        builder.Property(a => a.ContentType).IsRequired().HasMaxLength(100);

        builder.HasOne(a => a.Ticket)
            .WithMany(t => t.Attachments)
            .HasForeignKey(a => a.TicketId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(a => a.Comment)
            .WithMany(c => c.Attachments)
            .HasForeignKey(a => a.CommentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(a => a.KbArticle)
            .WithMany(k => k.Attachments)
            .HasForeignKey(a => a.KbArticleId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
