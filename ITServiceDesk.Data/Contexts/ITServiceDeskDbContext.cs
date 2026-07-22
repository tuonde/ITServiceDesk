using ITServiceDesk.Core.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System.Reflection;

namespace ITServiceDesk.Data.Contexts;

public class ITServiceDeskDbContext : IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>
{
    public ITServiceDeskDbContext(DbContextOptions<ITServiceDeskDbContext> options) : base(options)
    {
    }

    public DbSet<Department> Departments { get; set; }
    public DbSet<Ticket> Tickets { get; set; }
    public DbSet<Comment> Comments { get; set; }
    public DbSet<Attachment> Attachments { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<Notification> Notifications { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var entries = ChangeTracker.Entries()
            .Where(e => e.Entity is not AuditLog && 
                        (e.State == EntityState.Added || e.State == EntityState.Modified || e.State == EntityState.Deleted));

        var auditLogs = new List<AuditLog>();
        var firstUserId = Users.Select(u => u.Id).FirstOrDefault();
        
        if (firstUserId == Guid.Empty && entries.Any())
        {
            return await base.SaveChangesAsync(cancellationToken);
        }

        foreach (var entry in entries)
        {
            var action = entry.State switch
            {
                EntityState.Added => "Create",
                EntityState.Modified => "Update",
                EntityState.Deleted => "Delete",
                _ => "Unknown"
            };

            var tableName = entry.Metadata.GetTableName() ?? entry.Entity.GetType().Name;
            var oldValues = new Dictionary<string, object?>();
            var newValues = new Dictionary<string, object?>();

            foreach (var property in entry.Properties)
            {
                string propertyName = property.Metadata.Name;

                if (entry.State == EntityState.Added)
                {
                    newValues[propertyName] = property.CurrentValue;
                }
                else if (entry.State == EntityState.Deleted)
                {
                    oldValues[propertyName] = property.OriginalValue;
                }
                else if (entry.State == EntityState.Modified)
                {
                    if (property.IsModified)
                    {
                        oldValues[propertyName] = property.OriginalValue;
                        newValues[propertyName] = property.CurrentValue;
                    }
                }
            }

            var auditLog = new AuditLog
            {
                UserId = firstUserId,
                Action = $"{action} on {tableName}",
                OldValue = oldValues.Count == 0 ? null : System.Text.Json.JsonSerializer.Serialize(oldValues),
                NewValue = newValues.Count == 0 ? null : System.Text.Json.JsonSerializer.Serialize(newValues),
                CreatedAt = DateTime.UtcNow
            };

            if (entry.Entity is Ticket ticket)
            {
                auditLog.TicketId = ticket.Id;
            }
            else if (entry.Entity is Comment comment)
            {
                auditLog.TicketId = comment.TicketId;
            }
            else if (entry.Entity is Attachment attachment)
            {
                auditLog.TicketId = attachment.TicketId;
            }

            auditLogs.Add(auditLog);
        }

        if (auditLogs.Any())
        {
            await AuditLogs.AddRangeAsync(auditLogs, cancellationToken);
        }

        return await base.SaveChangesAsync(cancellationToken);
    }
}
