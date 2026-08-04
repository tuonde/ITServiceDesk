using ITServiceDesk.Core.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System.Reflection;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

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
    public DbSet<SystemSetting> SystemSettings { get; set; }
    public DbSet<Device> Devices { get; set; }
    public DbSet<DeviceCategory> DeviceCategories { get; set; }
    public DbSet<TicketCategory> TicketCategories { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());

        // Global DateTime UTC Conversion
        var dateTimeConverter = new ValueConverter<DateTime, DateTime>(
            v => v.ToUniversalTime(),
            v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        var nullableDateTimeConverter = new ValueConverter<DateTime?, DateTime?>(
            v => v.HasValue ? v.Value.ToUniversalTime() : v,
            v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v);

        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(DateTime))
                {
                    property.SetValueConverter(dateTimeConverter);
                }
                else if (property.ClrType == typeof(DateTime?))
                {
                    property.SetValueConverter(nullableDateTimeConverter);
                }
            }
        }
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

            var sensitiveProperties = new[] { "PasswordHash", "SecurityStamp", "ConcurrencyStamp", "NormalizedEmail", "NormalizedUserName", "LockoutEnd", "AccessFailedCount" };

            foreach (var property in entry.Properties)
            {
                string propertyName = property.Metadata.Name;

                if (sensitiveProperties.Contains(propertyName))
                    continue;

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

            if (oldValues.Count == 0 && newValues.Count == 0 && entry.State == EntityState.Modified)
            {
                continue;
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
