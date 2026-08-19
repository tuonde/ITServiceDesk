using ITServiceDesk.Core.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System.Reflection;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace ITServiceDesk.Data.Contexts;

public class ITServiceDeskDbContext : IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public ITServiceDeskDbContext(DbContextOptions<ITServiceDeskDbContext> options, IHttpContextAccessor httpContextAccessor) : base(options)
    {
        _httpContextAccessor = httpContextAccessor;
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
    
    // Knowledge Base
    public DbSet<KbCategory> KbCategories { get; set; }
    public DbSet<KbArticle> KbArticles { get; set; }
    public DbSet<KbArticleFeedback> KbArticleFeedbacks { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder
            .Properties<DateTime>()
            .HaveConversion<DateTimeUtcConverter>();

        configurationBuilder
            .Properties<DateTime?>()
            .HaveConversion<NullableDateTimeUtcConverter>();
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var entries = ChangeTracker.Entries()
            .Where(e => e.Entity is not AuditLog && 
                        (e.State == EntityState.Added || e.State == EntityState.Modified || e.State == EntityState.Deleted));

        var auditLogs = new List<AuditLog>();
        
        Guid? currentUserId = null;
        var userIdString = _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(userIdString, out var parsedId))
        {
            currentUserId = parsedId;
        }
        
        if (!currentUserId.HasValue && entries.Any())
        {
            // Eğer HttpContext yoksa (örn: arka plan işçisi), işlemi iptal etmiyoruz ama AuditLog yazarken UserId null olabilir
            // currentUserId zaten null
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
                UserId = currentUserId,
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

            var primaryKey = entry.Properties.FirstOrDefault(p => p.Metadata.IsPrimaryKey());
            if (primaryKey != null && primaryKey.CurrentValue != null)
            {
                auditLog.EntityId = primaryKey.CurrentValue.ToString();
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

public class DateTimeUtcConverter : ValueConverter<DateTime, DateTime>
{
    public DateTimeUtcConverter() : base(
        v => v.ToUniversalTime(), 
        v => DateTime.SpecifyKind(v, DateTimeKind.Utc)) { }
}

public class NullableDateTimeUtcConverter : ValueConverter<DateTime?, DateTime?>
{
    public NullableDateTimeUtcConverter() : base(
        v => v.HasValue ? v.Value.ToUniversalTime() : v, 
        v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v) { }
}
