using ITServiceDesk.Data.Contexts;
using ITServiceDesk.Service.Workers;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Testcontainers.MsSql;
using Xunit;

namespace ITServiceDesk.IntegrationTests.Infrastructure;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly MsSqlContainer _dbContainer;
    private string? _originalJwtSecret;

    public CustomWebApplicationFactory()
    {
        _dbContainer = new MsSqlBuilder("mcr.microsoft.com/mssql/server:2022-CU14-ubuntu-22.04")
            .WithPassword("TestStr0ngP@ssw0rd123!")
            .Build();
    }

    public async Task InitializeAsync()
    {
        _originalJwtSecret = System.Environment.GetEnvironmentVariable("JWT_SECRET");
        System.Environment.SetEnvironmentVariable("JWT_SECRET", "TestSuperSecretKeyForIntegration123!");

        await _dbContainer.StartAsync();

        // Run migrations on the fresh container before the API host tries to connect
        var connectionString = _dbContainer.GetConnectionString();
        var optionsBuilder = new DbContextOptionsBuilder<ITServiceDeskDbContext>();
        optionsBuilder.UseSqlServer(connectionString);

        using var context = new ITServiceDeskDbContext(optionsBuilder.Options, new HttpContextAccessor());
        await context.Database.MigrateAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        // Inject deterministic test configuration (e.g. for JWT)
        builder.ConfigureAppConfiguration((context, configBuilder) =>
        {
            configBuilder.AddInMemoryCollection(new[]
            {
                new System.Collections.Generic.KeyValuePair<string, string?>("JwtSettings:SecretKey", "TestSuperSecretKeyForIntegration123!")
            });
        });

        builder.ConfigureServices(services =>
        {
            // Remove the production DbContext options
            var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<ITServiceDeskDbContext>));
            if (descriptor != null)
            {
                services.Remove(descriptor);
            }

            // Register DbContext with the Testcontainer connection string
            services.AddDbContext<ITServiceDeskDbContext>(options =>
            {
                options.UseSqlServer(_dbContainer.GetConnectionString());
            });

            // Disable background worker to prevent DB mutations and race conditions during integration tests
            var workerDescriptor = services.SingleOrDefault(d => d.ImplementationType == typeof(SlaEscalationWorker));
            if (workerDescriptor != null)
            {
                services.Remove(workerDescriptor);
            }

            // Inject a startup filter to fake IP addresses for rate limiter isolation
            services.AddTransient<Microsoft.AspNetCore.Hosting.IStartupFilter, TestIpStartupFilter>();
        });
    }

    public new async Task DisposeAsync()
    {
        System.Environment.SetEnvironmentVariable("JWT_SECRET", _originalJwtSecret);
        await _dbContainer.DisposeAsync();
    }
}

public class TestIpStartupFilter : Microsoft.AspNetCore.Hosting.IStartupFilter
{
    public System.Action<Microsoft.AspNetCore.Builder.IApplicationBuilder> Configure(System.Action<Microsoft.AspNetCore.Builder.IApplicationBuilder> next)
    {
        return app =>
        {
            app.Use(async (context, next) =>
            {
                if (context.Request.Headers.TryGetValue("X-Test-Id", out var testId))
                {
                    var ipBytes = System.Security.Cryptography.MD5.HashData(System.Text.Encoding.UTF8.GetBytes(testId.ToString()));
                    context.Connection.RemoteIpAddress = new System.Net.IPAddress(new byte[] { 10, 0, ipBytes[0], ipBytes[1] });
                }
                else
                {
                    context.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("127.0.0.1");
                }
                await next.Invoke();
            });
            next(app);
        };
    }
}
