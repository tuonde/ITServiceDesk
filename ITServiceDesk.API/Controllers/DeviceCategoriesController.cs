using ITServiceDesk.Service.DTOs.Devices;
using ITServiceDesk.Service.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITServiceDesk.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class DeviceCategoriesController : ControllerBase
{
    private readonly IDeviceService _deviceService;

    public DeviceCategoriesController(IDeviceService deviceService)
    {
        _deviceService = deviceService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _deviceService.GetCategoriesAsync();
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] DeviceCategoryDto dto)
    {
        var result = await _deviceService.CreateCategoryAsync(dto.Name, dto.Description);
        return Ok(result);
    }
}
