using ITServiceDesk.IntegrationTests.Infrastructure;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace ITServiceDesk.IntegrationTests.Controllers;

[Collection("Integration Tests")]
public class SecurityPipelineIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public SecurityPipelineIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private HttpClient CreateClientWithTestId()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Id", Guid.NewGuid().ToString());
        return client;
    }

    [Fact]
    public async Task AuthEndpoint_WhenLimitExceeded_ShouldReturn429()
    {
        var client = CreateClientWithTestId();
        var loginDto = new { Email = "fake@example.com", Password = "FakePassword123!" };

        var tasks = new List<Task<HttpResponseMessage>>();
        for (int i = 0; i < 11; i++) // 10 is the limit, 11th should be 429
        {
            tasks.Add(client.PostAsJsonAsync("/api/Auth/login", loginDto));
        }

        var responses = await Task.WhenAll(tasks);
        
        var rateLimitedCount = responses.Count(r => r.StatusCode == HttpStatusCode.TooManyRequests);
        Assert.True(rateLimitedCount > 0, "Rate limiter did not block the 11th request.");
    }

    [Fact]
    public async Task AuthRateLimit_ShouldBePartitionedByClientIp()
    {
        var clientA = CreateClientWithTestId();
        var clientB = CreateClientWithTestId();
        var loginDto = new { Email = "fake@example.com", Password = "FakePassword123!" };

        var tasksA = new List<Task<HttpResponseMessage>>();
        for (int i = 0; i < 11; i++)
        {
            tasksA.Add(clientA.PostAsJsonAsync("/api/Auth/login", loginDto));
        }
        var responsesA = await Task.WhenAll(tasksA);
        Assert.Contains(responsesA, r => r.StatusCode == HttpStatusCode.TooManyRequests);

        // Client B should still be allowed
        var responseB = await clientB.PostAsJsonAsync("/api/Auth/login", loginDto);
        Assert.NotEqual(HttpStatusCode.TooManyRequests, responseB.StatusCode);
    }

    [Fact]
    public async Task SecurityHeaders_ShouldBePresentOnApiResponses()
    {
        // Arrange
        var client = CreateClientWithTestId();

        // Act
        // Make a simple unauthenticated request that hits the pipeline
        var response = await client.GetAsync("/api/Settings/logo-url"); // Simple public endpoint

        // Assert
        Assert.True(response.Headers.Contains("X-Content-Type-Options"), "Missing X-Content-Type-Options header");
        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").First());

        Assert.True(response.Headers.Contains("X-Frame-Options"), "Missing X-Frame-Options header");
        Assert.Equal("DENY", response.Headers.GetValues("X-Frame-Options").First());

        Assert.True(response.Headers.Contains("Referrer-Policy"), "Missing Referrer-Policy header");
        Assert.Equal("strict-origin-when-cross-origin", response.Headers.GetValues("Referrer-Policy").First());
    }

    [Fact]
    public async Task Swagger_WhenEnvironmentIsTesting_ShouldNotBeExposed()
    {
        // Arrange
        var client = CreateClientWithTestId();

        // Act
        var response = await client.GetAsync("/swagger/index.html");

        // Assert
        // The Swagger UI is only mapped in Development. In Testing, this route should not exist.
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GlobalRateLimit_WhenLimitExceeded_ShouldReturn429()
    {
        var client = CreateClientWithTestId();
        var loginDto = new { Email = "fake@example.com", Password = "FakePassword123!" };
        
        var tasks = new List<Task<HttpResponseMessage>>();
        for (int i = 0; i < 150; i++)
        {
            tasks.Add(client.GetAsync("/api/Settings/logo-url"));
        }
        
        var responses = await Task.WhenAll(tasks);
        
        var has429 = responses.Any(r => r.StatusCode == HttpStatusCode.TooManyRequests);
        Assert.True(has429, "Rate limiter did not block any concurrent requests!");
    }
}
