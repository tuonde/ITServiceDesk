using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Enums;
using ITServiceDesk.Data.Contexts;
using ITServiceDesk.Service.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ITServiceDesk.Service.Workers;

public class SlaEscalationWorker : BackgroundService
{
    private readonly ILogger<SlaEscalationWorker> _logger;
    private readonly IServiceScopeFactory _scopeFactory;

    public SlaEscalationWorker(ILogger<SlaEscalationWorker> logger, IServiceScopeFactory scopeFactory)
    {
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("SLA Escalation Worker başlatıldı.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<ITServiceDeskDbContext>();
                var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<TicketHub>>();

                var now = DateTime.UtcNow;

                // Süresi dolmuş ve hala açık olan biletleri bul
                var overdueTickets = await dbContext.Tickets
                    .Where(t => 
                        (t.Status == TicketStatus.Open || t.Status == TicketStatus.InProgress) 
                        && t.ResolutionDueDate < now 
                        && !t.IsEscalated)
                    .ToListAsync(stoppingToken);

                if (overdueTickets.Any())
                {
                    _logger.LogWarning("{Count} adet bilet için SLA ihlali tespit edildi. Eskalasyon işlemi başlatılıyor...", overdueTickets.Count);

                    foreach (var ticket in overdueTickets)
                    {
                        ticket.IsEscalated = true;

                        var auditLog = new AuditLog
                        {
                            Action = "SLA İhlali - Bilet Eskale Edildi",
                            TicketId = ticket.Id,
                            UserId = null, // Sistem tarafından yapıldığı için null
                            NewValue = "IsEscalated: True",
                            OldValue = "IsEscalated: False"
                        };

                        dbContext.AuditLogs.Add(auditLog);

                        // SignalR üzerinden anlık acil bildirim
                        await hubContext.Clients.All.SendAsync("TicketEscalated", ticket.Id, $"DİKKAT: #{ticket.Id} numaralı biletin SLA çözüm süresi aşıldı!", stoppingToken);
                        
                        _logger.LogInformation("Ticket {TicketId} eskale edildi.", ticket.Id);
                    }

                    await dbContext.SaveChangesAsync(stoppingToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SLA Escalation Worker çalışırken bir hata oluştu.");
            }

            // Test için 10 saniye, normalde TimeSpan.FromMinutes(5) olmalı.
            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
        }
    }
}
