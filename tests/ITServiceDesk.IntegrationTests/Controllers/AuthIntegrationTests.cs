using ITServiceDesk.API;
using ITServiceDesk.Core.Entities;
using ITServiceDesk.IntegrationTests.Infrastructure;
using ITServiceDesk.Service.DTOs.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using Xunit;

namespace ITServiceDesk.IntegrationTests.Controllers;

[Collection("AuthIntegrationTests")]
public class AuthIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AuthIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _client.DefaultRequestHeaders.Add("X-Test-Id", Guid.NewGuid().ToString());
    }

    private async Task<AppUser> SeedUserAsync(string email, string password, string role = "User")
    {
        using var scope = _factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        
        var user = new AppUser
        {
            UserName = email,
            Email = email,
            FirstName = "Test",
            LastName = "User",
            EmailConfirmed = true
        };

        var result = await userManager.CreateAsync(user, password);
        Assert.True(result.Succeeded, "Seed user creation failed");
        
        if (!await roleManager.RoleExistsAsync(role))
        {
            await roleManager.CreateAsync(new IdentityRole<Guid>(role));
        }

        var roleResult = await userManager.AddToRoleAsync(user, role);
        Assert.True(roleResult.Succeeded, "Seed user role assignment failed");
        return user;
    }

    [Fact]
    public async Task Register_WithValidPayload_ShouldCreateUser()
    {
        // Arrange
        var email = $"register-happy-{Guid.NewGuid()}@integration.local";
        var dto = new RegisterDto
        {
            FirstName = "Happy",
            LastName = "Path",
            Email = email,
            Password = "TestStr0ngP@ssw0rd123!"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/Auth/register", dto);

        // Assert
        response.EnsureSuccessStatusCode();
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains(email, content);

        using var scope = _factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var user = await userManager.FindByEmailAsync(email);
        Assert.NotNull(user);
        Assert.Equal("Happy", user.FirstName);
    }

    [Fact]
    public async Task Register_WithValidPayload_ShouldAssignOnlyUserRole()
    {
        // Arrange
        var email = $"register-role-{Guid.NewGuid()}@integration.local";
        var dto = new RegisterDto
        {
            FirstName = "Role",
            LastName = "Check",
            Email = email,
            Password = "TestStr0ngP@ssw0rd123!"
        };

        // Act
        await _client.PostAsJsonAsync("/api/Auth/register", dto);

        // Assert
        using var scope = _factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var user = await userManager.FindByEmailAsync(email);
        Assert.NotNull(user);

        var roles = await userManager.GetRolesAsync(user);
        Assert.Contains("User", roles);
        Assert.DoesNotContain("Admin", roles);
        Assert.DoesNotContain("Technician", roles);
    }

    [Fact]
    public async Task Register_WithPrivilegeEscalationAttempt_ShouldIgnoreRoleAndAssignUser()
    {
        // Arrange
        var email = $"register-escalate-{Guid.NewGuid()}@integration.local";
        
        var maliciousPayload = new
        {
            FirstName = "Hacker",
            LastName = "Man",
            Email = email,
            Password = "TestStr0ngP@ssw0rd123!",
            Role = "Admin",
            Roles = new[] { "Admin" }
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/Auth/register", maliciousPayload);

        // Assert
        response.EnsureSuccessStatusCode();

        using var scope = _factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var user = await userManager.FindByEmailAsync(email);
        Assert.NotNull(user);

        var roles = await userManager.GetRolesAsync(user);
        Assert.Contains("User", roles);
        Assert.DoesNotContain("Admin", roles);
    }

    [Fact]
    public async Task Register_WhenEmailAlreadyExists_ShouldReject()
    {
        // Arrange
        var email = $"duplicate-{Guid.NewGuid()}@integration.local";
        await SeedUserAsync(email, "TestStr0ngP@ssw0rd123!");

        var dto = new RegisterDto
        {
            FirstName = "Duplicate",
            LastName = "User",
            Email = email,
            Password = "TestStr0ngP@ssw0rd123!"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/Auth/register", dto);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Register_WithWeakPassword_ShouldReject()
    {
        // Arrange
        var email = $"weakpass-{Guid.NewGuid()}@integration.local";
        var dto = new RegisterDto
        {
            FirstName = "Weak",
            LastName = "Pass",
            Email = email,
            Password = "123" // Too short, no upper, no special
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/Auth/register", dto);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Login_WithValidCredentials_ShouldReturnJwt()
    {
        // Arrange
        var email = $"login-happy-{Guid.NewGuid()}@integration.local";
        var password = "TestStr0ngP@ssw0rd123!";
        var user = await SeedUserAsync(email, password, "Admin");

        var dto = new LoginDto { Email = email, Password = password };

        // Act
        var response = await _client.PostAsJsonAsync("/api/Auth/login", dto);

        // Assert
        response.EnsureSuccessStatusCode();
        var content = await response.Content.ReadAsStringAsync();
        
        using var jsonDoc = JsonDocument.Parse(content);
        var token = jsonDoc.RootElement.GetProperty("data").GetString();
        Assert.False(string.IsNullOrEmpty(token));

        // Decode JWT using modern JsonWebTokenHandler
        var handler = new Microsoft.IdentityModel.JsonWebTokens.JsonWebTokenHandler();
        var jwt = handler.ReadJsonWebToken(token);
        
        var roleClaim = jwt.Claims.FirstOrDefault(c => c.Type == "role" || c.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role");
        Assert.NotNull(roleClaim);
        Assert.Equal("Admin", roleClaim.Value);
        
        var nameIdentifierClaim = jwt.Claims.FirstOrDefault(c => c.Type == "nameid" || c.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
        Assert.NotNull(nameIdentifierClaim);
        Assert.Equal(user.Id.ToString(), nameIdentifierClaim.Value);

        var givenNameClaim = jwt.Claims.FirstOrDefault(c => c.Type == "givenname" || c.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname");
        Assert.NotNull(givenNameClaim);

        // Expiration
        if (jwt.ValidTo <= DateTime.UtcNow)
        {
            throw new Exception($"Expiration failure. ValidTo: {jwt.ValidTo:O}, UtcNow: {DateTime.UtcNow:O}");
        }

    }

    [Fact]
    public async Task Login_WithInvalidPassword_ShouldReturnBadRequest()
    {
        // Arrange
        var email = $"login-invalidpass-{Guid.NewGuid()}@integration.local";
        await SeedUserAsync(email, "TestStr0ngP@ssw0rd123!");

        var dto = new LoginDto { Email = email, Password = "WrongPassword!" };

        // Act
        var response = await _client.PostAsJsonAsync("/api/Auth/login", dto);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Login_WithUnknownEmail_ShouldReturnBadRequest()
    {
        // Arrange
        var dto = new LoginDto { Email = $"unknown-{Guid.NewGuid()}@integration.local", Password = "SomePassword123!" };

        // Act
        var response = await _client.PostAsJsonAsync("/api/Auth/login", dto);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        
        // Security check: Verify it doesn't give a different status or explicit "Email not found" vs "Wrong password"
        // Both invalid password and unknown email return 400 Bad Request.
    }

    [Fact]
    public async Task Login_AccountLockout_After5FailedAttempts_ShouldLockoutUser()
    {
        // Arrange
        var email = $"lockout-{Guid.NewGuid()}@integration.local";
        var correctPassword = "TestStr0ngP@ssw0rd123!";
        var user = await SeedUserAsync(email, correctPassword);

        var badDto = new LoginDto { Email = email, Password = "WrongPassword1!" };
        var goodDto = new LoginDto { Email = email, Password = correctPassword };

        // Act & Assert 1: 5 Failed attempts
        for (int i = 0; i < 5; i++)
        {
            var failResponse = await _client.PostAsJsonAsync("/api/Auth/login", badDto);
            Assert.Equal(HttpStatusCode.BadRequest, failResponse.StatusCode);
        }

        // Assert 2: Database state
        using var scope = _factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var dbUser = await userManager.FindByEmailAsync(email);
        Assert.NotNull(dbUser);
        
        var isLockedOut = await userManager.IsLockedOutAsync(dbUser);
        Assert.True(isLockedOut, "User should be locked out in the database");

        // Act & Assert 3: Try correct password while locked out
        var lockoutResponse = await _client.PostAsJsonAsync("/api/Auth/login", goodDto);
        
        // Ensure it doesn't return 200 OK (it returns BadRequest for locked out too)
        Assert.Equal(HttpStatusCode.BadRequest, lockoutResponse.StatusCode);
    }
}

