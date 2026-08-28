using ITServiceDesk.IntegrationTests.Infrastructure;
using Microsoft.Extensions.Configuration;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Xunit;

namespace ITServiceDesk.IntegrationTests.Controllers;

public class SettingsLogoTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public SettingsLogoTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task UploadLogo_SvgFile_ShouldBeRejected()
    {
        // Arrange
        var testEmail = $"admin-{Guid.NewGuid()}@integration.local";
        var testPassword = "BootstrapStrongPassword123!";

        var testFactory = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((context, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string>
                {
                    {"BootstrapAdmin:Enabled", "true"},
                    {"BootstrapAdmin:Email", testEmail},
                    {"BootstrapAdmin:Password", testPassword}
                });
            });
        });

        using var client = testFactory.CreateClient();

        // Login as Admin
        var loginResponse = await client.PostAsJsonAsync("/api/Auth/login", new { Email = testEmail, Password = testPassword });
        loginResponse.EnsureSuccessStatusCode();
        var loginResult = await loginResponse.Content.ReadFromJsonAsync<ITServiceDesk.Core.Wrappers.ApiResponse<string>>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", loginResult.Data);

        // Act - Try to upload SVG
        var content = new MultipartFormDataContent();
        var svgContent = new ByteArrayContent(System.Text.Encoding.UTF8.GetBytes("<svg></svg>"));
        svgContent.Headers.ContentType = MediaTypeHeaderValue.Parse("image/svg+xml");
        content.Add(svgContent, "file", "test.svg");

        var response = await client.PostAsync("/api/Settings/upload-logo", content);

        // Assert
        Assert.Equal(System.Net.HttpStatusCode.BadRequest, response.StatusCode);
        var result = await response.Content.ReadAsStringAsync();
        Assert.Contains("Desteklenmeyen dosya format", result);
    }

    [Fact]
    public async Task UploadLogo_ValidPng_ShouldSucceed()
    {
        // Arrange
        var testEmail = $"admin-{Guid.NewGuid()}@integration.local";
        var testPassword = "BootstrapStrongPassword123!";

        var testFactory = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((context, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string>
                {
                    {"BootstrapAdmin:Enabled", "true"},
                    {"BootstrapAdmin:Email", testEmail},
                    {"BootstrapAdmin:Password", testPassword}
                });
            });
        });

        using var client = testFactory.CreateClient();

        // Login as Admin
        var loginResponse = await client.PostAsJsonAsync("/api/Auth/login", new { Email = testEmail, Password = testPassword });
        loginResponse.EnsureSuccessStatusCode();
        var loginResult = await loginResponse.Content.ReadFromJsonAsync<ITServiceDesk.Core.Wrappers.ApiResponse<string>>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", loginResult.Data);

        // Act - Try to upload valid PNG magic bytes
        var content = new MultipartFormDataContent();
        var pngMagicBytes = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
        var pngContent = new ByteArrayContent(pngMagicBytes);
        pngContent.Headers.ContentType = MediaTypeHeaderValue.Parse("image/png");
        content.Add(pngContent, "file", "test.png");

        var response = await client.PostAsync("/api/Settings/upload-logo", content);

        // Assert
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadAsStringAsync();
        Assert.Contains("Logo başarıyla yüklendi", result);
    }
}
