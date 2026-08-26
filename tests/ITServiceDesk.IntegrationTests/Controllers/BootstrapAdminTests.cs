using ITServiceDesk.Core.Entities;
using ITServiceDesk.IntegrationTests.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using System.Net.Http.Json;
using ITServiceDesk.Service.DTOs.Auth;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace ITServiceDesk.IntegrationTests.Controllers;

public class BootstrapAdminTests
{
    [Fact]
    public async Task BootstrapAdmin_WhenEnabledAndConfigured_ShouldCreateAdminUserOnStartup()
    {
        // Arrange
        var testEmail = $"bootstrap-{Guid.NewGuid()}@integration.local";
        var testPassword = "BootstrapStrongPassword123!";

        var factory = new CustomWebApplicationFactory();
        await factory.InitializeAsync(); // Explicitly start container

        var testFactory = factory.WithWebHostBuilder(builder =>
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

        // Act
        using var client = testFactory.CreateClient();

        // Assert
        using var scope = testFactory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        
        var adminUser = await userManager.FindByEmailAsync(testEmail);
        Assert.NotNull(adminUser);

        var roles = await userManager.GetRolesAsync(adminUser);
        Assert.Contains("Admin", roles);
        
        await factory.DisposeAsync();
    }
    
    [Fact]
    public async Task Register_WithEmptyDatabase_ShouldOnlyCreateNormalUser()
    {
        // Arrange
        var factory = new CustomWebApplicationFactory();
        await factory.InitializeAsync();

        var testFactory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((context, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string>
                {
                    {"BootstrapAdmin:Enabled", "false"},
                    {"DemoData:Enabled", "false"}
                });
            });
        });
        
        using var client = testFactory.CreateClient();
        
        using var scope = testFactory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        
        var countAfterDelete = userManager.Users.Count();
        Assert.Equal(0, countAfterDelete);
        
        // Act - Register first user
        var email = $"first-user-{Guid.NewGuid()}@integration.local";
        var dto = new RegisterDto
        {
            FirstName = "First",
            LastName = "User",
            Email = email,
            Password = "TestStr0ngP@ssw0rd123!"
        };

        var response = await client.PostAsJsonAsync("/api/Auth/register", dto);
        response.EnsureSuccessStatusCode();
        
        // Assert
        var firstUser = await userManager.FindByEmailAsync(email);
        Assert.NotNull(firstUser);
        
        var roles = await userManager.GetRolesAsync(firstUser);
        Assert.Contains("User", roles);
        Assert.DoesNotContain("Admin", roles);
        
        await factory.DisposeAsync();
    }
}
