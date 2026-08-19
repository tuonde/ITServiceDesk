using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Enums;
using ITServiceDesk.Data.Contexts;
using ITServiceDesk.Service.DTOs.Reports;
using ITServiceDesk.Service.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace ITServiceDesk.Service.Services;

public class ReportManager : IReportService
{
    private readonly ITServiceDeskDbContext _context;

    public ReportManager(ITServiceDeskDbContext context)
    {
        _context = context;
    }

    public async Task<ReportMetricsDto> GetDashboardMetricsAsync()
    {
        var result = new ReportMetricsDto();
        
        const int problemDeptDays = -7;
        const int trendDays = -30;
        const int maxDeptPerformanceCount = 10;

        var baseQuery = _context.Tickets.AsNoTracking().Where(t => !t.IsDeleted);

        // 1. Ortalama Çözüm Süresi
        var resolvedTickets = await baseQuery
            .Where(t => t.Status == TicketStatus.Resolved || t.Status == TicketStatus.Closed)
            .Select(t => new { t.CreatedAt, t.ResolvedAt })
            .ToListAsync();

        int resolvedWithDates = 0;
        double totalResolutionMinutes = 0;
        foreach (var t in resolvedTickets)
        {
            if (t.ResolvedAt.HasValue)
            {
                var diff = t.ResolvedAt.Value - t.CreatedAt;
                totalResolutionMinutes += diff.TotalMinutes;
                resolvedWithDates++;
            }
        }

        if (resolvedWithDates > 0)
        {
            var avgMins = Math.Floor(totalResolutionMinutes / resolvedWithDates);
            var avgSecs = Math.Round((totalResolutionMinutes / resolvedWithDates) * 60);

            if (avgSecs < 60)
            {
                result.AvgResString = $"{avgSecs} saniye";
            }
            else
            {
                var days = Math.Floor(avgMins / (24 * 60));
                var hours = Math.Floor((avgMins % (24 * 60)) / 60);
                var mins = avgMins % 60;

                var parts = new System.Collections.Generic.List<string>();
                if (days > 0) parts.Add($"{days} gün");
                if (hours > 0) parts.Add($"{hours} saat");
                if (mins > 0) parts.Add($"{mins} dakika");
                
                result.AvgResString = string.Join(" ", parts);
            }
        }
        else
        {
            result.AvgResString = "0 saniye";
        }

        // 2. Haftanın En Sorunlu Departmanı
        var problemDeptDateLimit = DateTime.UtcNow.AddDays(problemDeptDays);
        var topDeptData = await baseQuery
            .Where(t => t.CreatedAt >= problemDeptDateLimit && t.Department != null)
            .GroupBy(t => t.Department!.Name)
            .Select(g => new { Dept = g.Key, Count = g.Count() })
            .OrderByDescending(g => g.Count)
            .FirstOrDefaultAsync();

        if (topDeptData != null)
        {
            result.TopDept = topDeptData.Dept;
            result.MaxDeptTickets = topDeptData.Count;
        }
        else
        {
            result.TopDept = "Yok";
            result.MaxDeptTickets = 0;
        }

        // 3. SLA İhlal Oranı & Çözüm Oranı
        var totalTickets = await baseQuery.CountAsync();
        if (totalTickets > 0)
        {
            var slaBreaches = await baseQuery
                .CountAsync(t => t.IsEscalated || (t.ResolutionDueDate != null && (t.ResolvedAt == null ? DateTime.UtcNow : t.ResolvedAt.Value) > t.ResolutionDueDate));
            result.SlaBreachPercent = ((double)slaBreaches / totalTickets * 100).ToString("F1");

            var resolvedCount = resolvedTickets.Count;
            result.ResolutionRate = ((double)resolvedCount / totalTickets * 100).ToString("F1");
        }

        // 4. Departman Performansı (Ortalama Saat)
        var deptPerf = await baseQuery
            .Where(t => (t.Status == TicketStatus.Resolved || t.Status == TicketStatus.Closed) && t.Department != null)
            .Select(t => new { DeptName = t.Department!.Name, t.CreatedAt, t.ResolvedAt })
            .ToListAsync();
        
        result.DepartmentPerformance = deptPerf
            .Where(t => t.ResolvedAt.HasValue)
            .GroupBy(t => t.DeptName)
            .Select(g => new DepartmentPerformanceDto
            {
                FullName = g.Key,
                Name = g.Key.Length > 15 ? g.Key.Substring(0, 15) + "..." : g.Key,
                OrtalamaSaat = Math.Round(g.Average(t => (t.ResolvedAt!.Value - t.CreatedAt).TotalHours), 1)
            })
            .OrderByDescending(d => d.OrtalamaSaat)
            .Take(maxDeptPerformanceCount)
            .ToList();

        // 5. Trend Grafiği (Son X Gün)
        var trendDateLimit = DateTime.UtcNow.AddDays(trendDays);
        var trendData = await baseQuery
            .Where(t => t.CreatedAt >= trendDateLimit)
            .GroupBy(t => t.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .ToListAsync();

        var trendDict = trendData.ToDictionary(k => k.Date, v => v.Count);
        var trendList = new System.Collections.Generic.List<TrendDataDto>();
        for (int i = 29; i >= 0; i--)
        {
            var date = DateTime.UtcNow.AddDays(-i).Date;
            trendList.Add(new TrendDataDto
            {
                Date = date.ToString("yyyy-MM-dd"), // React will format it
                TalepSayisi = trendDict.ContainsKey(date) ? trendDict[date] : 0
            });
        }
        result.TrendData = trendList;

        // 6. SLA Başarı Dağılımı (Pie Chart)
        int onTime = 0, delayed = 0, pending = 0;
        var slaQuery = await baseQuery.Select(t => new { t.Status, t.IsEscalated, t.ResolutionDueDate, t.ResolvedAt }).ToListAsync();
        foreach (var t in slaQuery)
        {
            if (t.Status == TicketStatus.Resolved || t.Status == TicketStatus.Closed)
            {
                if (t.IsEscalated || (t.ResolutionDueDate.HasValue && t.ResolvedAt.HasValue && t.ResolvedAt.Value > t.ResolutionDueDate.Value))
                    delayed++;
                else
                    onTime++;
            }
            else
            {
                if (t.IsEscalated || (t.ResolutionDueDate.HasValue && DateTime.UtcNow > t.ResolutionDueDate.Value))
                    delayed++;
                else
                    pending++;
            }
        }
        result.SlaPieData = new System.Collections.Generic.List<SlaPieDataDto>
        {
            new SlaPieDataDto { Name = "Zamanında Çözülen", Value = onTime, Color = "#10b981" },
            new SlaPieDataDto { Name = "Geciken / İhlal", Value = delayed, Color = "#f43f5e" },
            new SlaPieDataDto { Name = "Bekleyen (Süresi Var)", Value = pending, Color = "#3b82f6" }
        };

        // 7. Departmanlara Göre Talepler
        var deptCounts = await baseQuery
            .Where(t => t.Department != null)
            .GroupBy(t => t.Department!.Name)
            .Select(g => new { Dept = g.Key, Count = g.Count() })
            .OrderByDescending(g => g.Count)
            .ToListAsync();
            
        result.DeptBarData = deptCounts.Select(g => new DeptBarDataDto
        {
            FullName = g.Dept,
            Name = g.Dept.Length > 15 ? g.Dept.Substring(0, 15) + "..." : g.Dept,
            Count = g.Count
        }).ToList();

        // 8. Teknisyen Performansı
        var techPerf = await baseQuery
            .Where(t => (t.Status == TicketStatus.Resolved || t.Status == TicketStatus.Closed) && t.Assignee != null)
            .Select(t => new { TechName = t.Assignee!.FirstName + " " + t.Assignee.LastName, t.CreatedAt, t.ResolvedAt })
            .ToListAsync();
        
        result.TechnicianPerformance = techPerf
            .Where(t => t.ResolvedAt.HasValue)
            .GroupBy(t => t.TechName)
            .Select(g => new TechnicianPerformanceDto
            {
                Name = g.Key,
                OrtalamaSaat = Math.Round(g.Average(t => (t.ResolvedAt!.Value - t.CreatedAt).TotalHours), 1),
                CozulenTalep = g.Count()
            })
            .OrderBy(d => d.OrtalamaSaat)
            .Take(10)
            .ToList();

        // 9. Kategori Dağılımı
        var colors = new[] { "#f59e0b", "#3b82f6", "#10b981", "#ec4899", "#8b5cf6", "#64748b", "#14b8a6", "#f43f5e" };
        var catCounts = await baseQuery
            .Where(t => t.Category != null)
            .GroupBy(t => t.Category!.Name)
            .Select(g => new { CatName = g.Key, Count = g.Count() })
            .OrderByDescending(g => g.Count)
            .ToListAsync();
            
        result.CategoryDistribution = catCounts.Select((g, i) => new CategoryDistributionDto
        {
            Name = g.CatName,
            Value = g.Count,
            Color = colors[i % colors.Length]
        }).ToList();

        // 10. Maliyet Dağılımı
        var costCounts = await baseQuery
            .Where(t => t.RepairCost > 0 && t.Department != null)
            .GroupBy(t => t.Department!.Name)
            .Select(g => new { Dept = g.Key, Cost = g.Sum(x => x.RepairCost) })
            .OrderByDescending(g => g.Cost)
            .Take(10)
            .ToListAsync();
            
        result.CostByDepartment = costCounts.Select(g => new CostByDepartmentDto
        {
            Name = g.Dept,
            Maliyet = g.Cost ?? 0
        }).ToList();

        // 11. İş Yükü Dağılımı (Aktif Biletler - Teknisyenler)
        var workload = await baseQuery
            .Where(t => (t.Status == TicketStatus.Open || t.Status == TicketStatus.InProgress) && t.Assignee != null)
            .GroupBy(t => t.Assignee!.FirstName + " " + t.Assignee.LastName)
            .Select(g => new { TechName = g.Key, Count = g.Count() })
            .OrderByDescending(g => g.Count)
            .ToListAsync();
            
        result.WorkloadData = workload.Select(g => new WorkloadDataDto
        {
            Name = g.TechName,
            Count = g.Count
        }).ToList();

        return result;
    }
}
