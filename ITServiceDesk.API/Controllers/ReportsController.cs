using ITServiceDesk.Service.DTOs.Reports;
using ITServiceDesk.Service.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace ITServiceDesk.API.Controllers;

[Authorize(Roles = "Admin,Technician")]
[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboardMetrics()
    {
        var metrics = await _reportService.GetDashboardMetricsAsync();
        // Since we are not using ApiResponse wrapper everywhere, we can just return Ok
        // But let's check if the frontend expects a wrapper. In ticketService.ts it expects isSuccess.
        // Actually, let's just return it directly and map it in the frontend.
        return Ok(new { data = metrics, isSuccess = true, message = "Rapor başarıyla getirildi" });
    }
}
