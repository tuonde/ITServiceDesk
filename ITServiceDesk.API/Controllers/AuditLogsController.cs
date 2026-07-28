using ITServiceDesk.Core.Wrappers;
using ITServiceDesk.Service.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace ITServiceDesk.API.Controllers;

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/[controller]")]
public class AuditLogsController : ControllerBase
{
    private readonly IAuditLogService _auditLogService;

    public AuditLogsController(IAuditLogService auditLogService)
    {
        _auditLogService = auditLogService;
    }
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] int pageNumber = 1, 
        [FromQuery] int pageSize = 50,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] string action = null)
    {
        var result = await _auditLogService.GetAllLogsAsync(pageNumber, pageSize, startDate, endDate, action);
        return Ok(result);
    }
}
