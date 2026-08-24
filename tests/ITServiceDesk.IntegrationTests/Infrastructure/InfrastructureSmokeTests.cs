using ITServiceDesk.Data.Contexts;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace ITServiceDesk.IntegrationTests.Infrastructure;

public class InfrastructureSmokeTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public InfrastructureSmokeTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public void Host_WithSqlServerTestcontainer_ShouldStartSuccessfully()
    {
        // Act
        var client = _factory.CreateClient();

        // Assert
        Assert.NotNull(client);
    }

    [Fact]
    public async Task TestDatabase_ShouldUseSqlServerContainerAndAcceptConnection()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ITServiceDeskDbContext>();

        // Act
        var canConnect = await context.Database.CanConnectAsync();

        // Assert
        Assert.True(canConnect, "Testveritabanı bağlantısı başarısız oldu.");
        
        // Yanlışlıkla InMemory veya .\SQLEXPRESS kullanılmadığını doğrula
        Assert.Equal("Microsoft.EntityFrameworkCore.SqlServer", context.Database.ProviderName);
        var connectionString = context.Database.GetConnectionString();
        Assert.NotNull(connectionString);
        Assert.DoesNotContain("SQLEXPRESS", connectionString);
        Assert.DoesNotContain("LocalDb", connectionString);
    }

    [Fact]
    public async Task TestDatabase_ShouldHaveProductionMigrationsApplied()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ITServiceDeskDbContext>();

        // Act
        var pendingMigrations = await context.Database.GetPendingMigrationsAsync();
        var appliedMigrations = await context.Database.GetAppliedMigrationsAsync();

        // Assert
        Assert.Empty(pendingMigrations);
        Assert.NotEmpty(appliedMigrations);
    }
}
