using System.Threading.Tasks;
using ITServiceDesk.Service.DTOs.Reports;

namespace ITServiceDesk.Service.Interfaces;

public interface IReportService
{
    Task<ReportMetricsDto> GetDashboardMetricsAsync();
}
