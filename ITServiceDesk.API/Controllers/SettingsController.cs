using ITServiceDesk.Core.Wrappers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

using ITServiceDesk.Service.DTOs.Settings;
using ITServiceDesk.Service.Interfaces;

namespace ITServiceDesk.API.Controllers;

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private readonly ISystemSettingsService _settingsService;

    public SettingsController(IWebHostEnvironment env, ISystemSettingsService settingsService)
    {
        _env = env;
        _settingsService = settingsService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetSettings()
    {
        var settings = await _settingsService.GetSettingsAsync();
        return Ok(ApiResponse<SystemSettingsDto>.Success(settings));
    }

    [HttpPut]
    public async Task<IActionResult> UpdateSettings([FromBody] SystemSettingsDto dto)
    {
        await _settingsService.UpdateSettingsAsync(dto);
        return Ok(ApiResponse<string>.Success(string.Empty, "Ayarlar başarıyla güncellendi."));
    }

    [HttpPost("upload-logo")]
    public async Task<IActionResult> UploadLogo(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(ApiResponse<string>.Fail("Geçersiz dosya."));

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".svg", ".webp" };
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

        if (!allowedExtensions.Contains(extension))
            return BadRequest(ApiResponse<string>.Fail("Desteklenmeyen dosya formatı. Sadece resim dosyaları kabul edilir."));

        // Sunucu kök dizinini belirle
        string webRootPath = _env.WebRootPath;
        if (string.IsNullOrWhiteSpace(webRootPath))
        {
            webRootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        }

        string uploadsFolder = Path.Combine(webRootPath, "uploads");
        if (!Directory.Exists(uploadsFolder))
            Directory.CreateDirectory(uploadsFolder);

        // Eski logoları temizleme mantığı eklenebilir veya aynı isimle (logo.png) yazılabilir.
        // Daha güvenli olması için her seferinde logo.png, logo.jpg gibi sabit isim yerine uzantıyı koruyarak kaydediyoruz
        string uniqueFileName = $"logo{extension}";
        string filePath = Path.Combine(uploadsFolder, uniqueFileName);

        // Varsa eski "logo.*" dosyalarını sil
        var existingLogos = Directory.GetFiles(uploadsFolder, "logo.*");
        foreach (var oldLogo in existingLogos)
        {
            try { System.IO.File.Delete(oldLogo); } catch { }
        }

        using (var fileStream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(fileStream);
        }

        // Cache-busting için time string ekleyelim
        var url = $"/uploads/{uniqueFileName}?v={DateTime.UtcNow.Ticks}";
        
        return Ok(ApiResponse<string>.Success(url, "Logo başarıyla yüklendi."));
    }

    [HttpGet("logo-url")]
    [AllowAnonymous]
    public IActionResult GetLogoUrl()
    {
        string webRootPath = _env.WebRootPath;
        if (string.IsNullOrWhiteSpace(webRootPath))
        {
            webRootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        }
        string uploadsFolder = Path.Combine(webRootPath, "uploads");
        
        if (Directory.Exists(uploadsFolder))
        {
            var existingLogos = Directory.GetFiles(uploadsFolder, "logo.*");
            if (existingLogos.Any())
            {
                var file = existingLogos.First();
                var extension = Path.GetExtension(file);
                // Dosya son değiştirilme tarihini cache buster olarak kullan
                var lastModified = System.IO.File.GetLastWriteTimeUtc(file).Ticks;
                return Ok(ApiResponse<string>.Success($"/uploads/logo{extension}?v={lastModified}"));
            }
        }

        return Ok(ApiResponse<string>.Success("")); // Logo yoksa boş string dön
    }
}
