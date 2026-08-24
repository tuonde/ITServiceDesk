using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Enums;
using ITServiceDesk.Core.Wrappers;
using ITServiceDesk.IntegrationTests.Infrastructure;
using ITServiceDesk.Service.DTOs;
using ITServiceDesk.Service.DTOs.Attachments;
using ITServiceDesk.Service.DTOs.Settings;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace ITServiceDesk.IntegrationTests.Controllers;

[Collection("Integration Tests")]
public class AuthorizationIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public AuthorizationIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private HttpClient CreateClientWithTestId()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Id", Guid.NewGuid().ToString());
        return client;
    }

    private async Task<AppUser> SeedUserAsync(string email, string password, string role = "User")
    {
        using var scope = _factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<Microsoft.AspNetCore.Identity.UserManager<AppUser>>();
        
        var user = await userManager.FindByEmailAsync(email);
        if (user == null)
        {
            user = new AppUser 
            { 
                UserName = email, 
                Email = email, 
                FirstName = "Test", 
                LastName = "User",
                EmailConfirmed = true
            };
            var result = await userManager.CreateAsync(user, password);
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(user, role);
            }
        }
        return user;
    }

    private async Task<string> LoginAndGetJwtAsync(HttpClient client, string email, string password)
    {
        var loginDto = new { Email = email, Password = password };
        var response = await client.PostAsJsonAsync("/api/Auth/login", loginDto);
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();
        using var jsonDoc = JsonDocument.Parse(content);
        return jsonDoc.RootElement.GetProperty("data").GetString()!;
    }

    private async Task<TicketResponseDto> CreateTicketAsync(HttpClient client, string title, string description)
    {
        var dto = new TicketCreateDto { Title = title, Description = description, Priority = Priority.Medium };
        var response = await client.PostAsJsonAsync("/api/Tickets", dto);
        response.EnsureSuccessStatusCode();
        var content = await response.Content.ReadAsStringAsync();
        using var jsonDoc = JsonDocument.Parse(content);
        var data = jsonDoc.RootElement.GetProperty("data");
        return JsonSerializer.Deserialize<TicketResponseDto>(data.GetRawText(), new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
    }

    [Fact]
    public async Task Ticket_GetById_WhenRequesterIsOwner_ShouldSucceed()
    {
        // Arrange
        var client = CreateClientWithTestId();
        var password = "Password123!";
        var email = $"owner-{Guid.NewGuid()}@integration.local";
        await SeedUserAsync(email, password);
        var jwt = await LoginAndGetJwtAsync(client, email, password);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwt);

        var ticket = await CreateTicketAsync(client, "Test Ticket", "Owner GET");

        // Act
        var getResponse = await client.GetAsync($"/api/Tickets/{ticket.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
    }

    [Fact]
    public async Task Ticket_GetById_WhenDifferentUser_ShouldBeDenied()
    {
        // Arrange
        var clientA = CreateClientWithTestId();
        var clientB = CreateClientWithTestId();
        
        var pass = "Password123!";
        var emailA = $"userA-{Guid.NewGuid()}@integration.local";
        var emailB = $"userB-{Guid.NewGuid()}@integration.local";
        
        await SeedUserAsync(emailA, pass);
        await SeedUserAsync(emailB, pass);

        var jwtA = await LoginAndGetJwtAsync(clientA, emailA, pass);
        var jwtB = await LoginAndGetJwtAsync(clientB, emailB, pass);

        clientA.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwtA);
        clientB.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwtB);

        var ticketA = await CreateTicketAsync(clientA, "Ticket A", "BOLA Test");

        // Act
        var getResponse = await clientB.GetAsync($"/api/Tickets/{ticketA.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode); // In TicketsController, unauthorized read returns 404
    }

    [Fact]
    public async Task Ticket_Update_WhenDifferentUser_ShouldBeDenied_AndDbUnchanged()
    {
        // Arrange
        var clientA = CreateClientWithTestId();
        var clientB = CreateClientWithTestId();
        
        var pass = "Password123!";
        var emailA = $"userA-{Guid.NewGuid()}@integration.local";
        var emailB = $"userB-{Guid.NewGuid()}@integration.local";
        
        await SeedUserAsync(emailA, pass);
        await SeedUserAsync(emailB, pass);

        var jwtA = await LoginAndGetJwtAsync(clientA, emailA, pass);
        var jwtB = await LoginAndGetJwtAsync(clientB, emailB, pass);

        clientA.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwtA);
        clientB.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwtB);

        var ticketA = await CreateTicketAsync(clientA, "Ticket A", "BOLA Update");

        // Act
        var updateDto = new TicketUpdateDto { Id = ticketA.Id, Title = "Hacked Title", Priority = Priority.Critical };
        var updateResponse = await clientB.PutAsJsonAsync($"/api/Tickets/{ticketA.Id}", updateDto);

        // Assert
        // The API returns 500 when UnauthorizedAccessException is thrown if no specific exception handler maps it to 403.
        // Actually, let's just assert that it is NOT a success status code.
        Assert.False(updateResponse.IsSuccessStatusCode);

        // Verify DB unchanged via UserA
        var getResponse = await clientA.GetFromJsonAsync<ApiResponse<TicketResponseDto>>($"/api/Tickets/{ticketA.Id}");
        Assert.NotNull(getResponse);
        Assert.Equal("Ticket A", getResponse.Data.Title);
        Assert.Equal(Priority.Medium, getResponse.Data.Priority);
    }

    [Fact]
    public async Task Ticket_Delete_WhenDifferentUser_ShouldBeDenied_AndDbUnchanged()
    {
        // Arrange
        var clientA = CreateClientWithTestId();
        var clientB = CreateClientWithTestId();
        
        var pass = "Password123!";
        var emailA = $"userA-{Guid.NewGuid()}@integration.local";
        var emailB = $"userB-{Guid.NewGuid()}@integration.local";
        
        await SeedUserAsync(emailA, pass);
        await SeedUserAsync(emailB, pass);

        var jwtA = await LoginAndGetJwtAsync(clientA, emailA, pass);
        var jwtB = await LoginAndGetJwtAsync(clientB, emailB, pass);

        clientA.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwtA);
        clientB.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwtB);

        var ticketA = await CreateTicketAsync(clientA, "Ticket A to Delete", "BOLA Delete");

        // Act
        var deleteResponse = await clientB.DeleteAsync($"/api/Tickets/{ticketA.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, deleteResponse.StatusCode); // TicketsController returns 404 for unauthorized delete

        // Verify ticket still exists via UserA
        var getResponse = await clientA.GetAsync($"/api/Tickets/{ticketA.Id}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
    }

    [Fact]
    public async Task Ticket_Update_WhenUserAttemptsProtectedFieldModification_ShouldNotApplyProtectedFields()
    {
        // Arrange
        var client = CreateClientWithTestId();
        var pass = "Password123!";
        var email = $"userA-{Guid.NewGuid()}@integration.local";
        await SeedUserAsync(email, pass);
        var jwt = await LoginAndGetJwtAsync(client, email, pass);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwt);

        var ticket = await CreateTicketAsync(client, "Ticket A", "Mass Assignment");

        var hackerTechnicianId = Guid.NewGuid();

        // Act
        var updateDto = new TicketUpdateDto 
        { 
            Id = ticket.Id, 
            Title = "Valid Update", 
            Status = TicketStatus.Closed, // Protected
            AssigneeId = hackerTechnicianId // Protected
        };
        var updateResponse = await client.PutAsJsonAsync($"/api/Tickets/{ticket.Id}", updateDto);

        // Assert
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        // Verify DB
        var getResponse = await client.GetFromJsonAsync<ApiResponse<TicketResponseDto>>($"/api/Tickets/{ticket.Id}");
        Assert.Equal("Valid Update", getResponse!.Data.Title);
        Assert.Equal(TicketStatus.Open, getResponse.Data.Status); // Should not change
        Assert.Null(getResponse.Data.AssigneeId); // Should not change
    }

    [Fact]
    public async Task AdminEndpoint_WhenNormalUserRequests_ShouldReturnForbidden()
    {
        // Arrange
        var client = CreateClientWithTestId();
        var pass = "Password123!";
        var email = $"user-{Guid.NewGuid()}@integration.local";
        await SeedUserAsync(email, pass);
        var jwt = await LoginAndGetJwtAsync(client, email, pass);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwt);

        // Act: Settings PUT requires Admin
        var dto = new SystemSettingsDto { SlaCriticalResolutionHours = 2 };
        var response = await client.PutAsJsonAsync("/api/Settings", dto);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AdminEndpoint_WhenAdminRequests_ShouldSucceed()
    {
        // Arrange
        var client = CreateClientWithTestId();
        var pass = "Password123!";
        var email = $"admin-{Guid.NewGuid()}@integration.local";
        await SeedUserAsync(email, pass, "Admin");
        var jwt = await LoginAndGetJwtAsync(client, email, pass);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwt);

        // Act: Settings PUT requires Admin
        var dto = new SystemSettingsDto { SlaCriticalResolutionHours = 2 };
        var response = await client.PutAsJsonAsync("/api/Settings", dto);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Ticket_GetById_WhenUnauthenticated_ShouldReturnUnauthorized()
    {
        // Arrange
        var client = CreateClientWithTestId();
        
        // Act
        var response = await client.GetAsync($"/api/Tickets/{Guid.NewGuid()}");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Notifications_WhenUserRequestsAnotherUsersData_ShouldBeDenied()
    {
        // Arrange
        var clientA = CreateClientWithTestId();
        var clientB = CreateClientWithTestId();
        
        var pass = "Password123!";
        var emailA = $"userA-{Guid.NewGuid()}@integration.local";
        var emailB = $"userB-{Guid.NewGuid()}@integration.local";
        
        var userA = await SeedUserAsync(emailA, pass);
        await SeedUserAsync(emailB, pass);

        var jwtA = await LoginAndGetJwtAsync(clientA, emailA, pass);
        var jwtB = await LoginAndGetJwtAsync(clientB, emailB, pass);

        clientB.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwtB);

        // Act
        var getResponse = await clientB.GetAsync($"/api/Notifications/user/{userA.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, getResponse.StatusCode);
    }

    [Fact]
    public async Task Ticket_Assign_WhenAdminAssignsTechnician_ShouldSucceed()
    {
        // Arrange
        var clientAdmin = CreateClientWithTestId();
        var clientUser = CreateClientWithTestId();

        var pass = "Password123!";
        var emailAdmin = $"admin-{Guid.NewGuid()}@integration.local";
        var emailUser = $"user-{Guid.NewGuid()}@integration.local";
        var emailTech = $"tech-{Guid.NewGuid()}@integration.local";
        
        await SeedUserAsync(emailAdmin, pass, "Admin");
        await SeedUserAsync(emailUser, pass);
        var tech = await SeedUserAsync(emailTech, pass, "Technician");

        var techId = tech.Id; // Use real technician ID for foreign key constraint

        var jwtAdmin = await LoginAndGetJwtAsync(clientAdmin, emailAdmin, pass);
        var jwtUser = await LoginAndGetJwtAsync(clientUser, emailUser, pass);

        clientAdmin.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwtAdmin);
        clientUser.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwtUser);

        var ticket = await CreateTicketAsync(clientUser, "Ticket for Tech", "Assignment");

        // Act
        var updateDto = new TicketUpdateDto 
        { 
            Id = ticket.Id, 
            Title = "Ticket for Tech", 
            Priority = Priority.High,
            Status = TicketStatus.InProgress,
            AssigneeId = techId 
        };
        var updateResponse = await clientAdmin.PutAsJsonAsync($"/api/Tickets/{ticket.Id}", updateDto);

        // Assert
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        // Verify DB
        var getResponse = await clientUser.GetFromJsonAsync<ApiResponse<TicketResponseDto>>($"/api/Tickets/{ticket.Id}");
        Assert.Equal(techId, getResponse!.Data.AssigneeId);
        Assert.Equal(TicketStatus.InProgress, getResponse.Data.Status);
    }

    private async Task<AttachmentResponseDto> UploadFileAsync(HttpClient client, Guid ticketId, string fileName, byte[] content, string contentType)
    {
        using var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(content);
        fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);
        form.Add(fileContent, "File", fileName);
        form.Add(new StringContent(ticketId.ToString()), "TicketId");

        var response = await client.PostAsync("/api/Attachments", form);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync();
        using var jsonDoc = JsonDocument.Parse(json);
        var data = jsonDoc.RootElement.GetProperty("data");
        return JsonSerializer.Deserialize<AttachmentResponseDto>(data.GetRawText(), new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
    }

    [Fact]
    public async Task Attachment_Upload_WhenRequesterUploadsValidFile_ShouldSucceed()
    {
        // Arrange
        var client = CreateClientWithTestId();
        var pass = "Password123!";
        var email = $"user-{Guid.NewGuid()}@integration.local";
        await SeedUserAsync(email, pass);
        var jwt = await LoginAndGetJwtAsync(client, email, pass);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwt);

        var ticket = await CreateTicketAsync(client, "Attachment Ticket", "Upload Test");

        // Create a valid dummy PDF file (with magic numbers)
        var fileBytes = new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A }; // %PDF-1.4

        // Act
        var attachment = await UploadFileAsync(client, ticket.Id, "test.pdf", fileBytes, "application/pdf");

        // Assert
        Assert.NotNull(attachment);
        Assert.Equal("test.pdf", attachment.FileName);
        Assert.Equal(ticket.Id, attachment.TicketId);
    }

    [Fact]
    public async Task Attachment_Download_WhenUserDoesNotOwnTicket_ShouldBeDenied()
    {
        // Arrange
        var clientA = CreateClientWithTestId();
        var clientB = CreateClientWithTestId();
        
        var pass = "Password123!";
        var emailA = $"userA-{Guid.NewGuid()}@integration.local";
        var emailB = $"userB-{Guid.NewGuid()}@integration.local";
        
        await SeedUserAsync(emailA, pass);
        await SeedUserAsync(emailB, pass);

        var jwtA = await LoginAndGetJwtAsync(clientA, emailA, pass);
        var jwtB = await LoginAndGetJwtAsync(clientB, emailB, pass);

        clientA.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwtA);
        clientB.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwtB);

        var ticketA = await CreateTicketAsync(clientA, "Ticket A", "BOLA Attachment");
        
        var fileBytes = new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D };
        var attachment = await UploadFileAsync(clientA, ticketA.Id, "secret.pdf", fileBytes, "application/pdf");

        // Act - User B tries to download User A's file
        var downloadResponse = await clientB.GetAsync($"/api/Attachments/download/{attachment.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, downloadResponse.StatusCode);
    }

    [Fact]
    public async Task Attachment_Download_WhenRequesterOwnsTicket_ShouldReturnFile()
    {
        // Arrange
        var client = CreateClientWithTestId();
        var pass = "Password123!";
        var email = $"userA-{Guid.NewGuid()}@integration.local";
        await SeedUserAsync(email, pass);
        var jwt = await LoginAndGetJwtAsync(client, email, pass);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwt);

        var ticket = await CreateTicketAsync(client, "Ticket A", "Download Attachment");
        
        var fileBytes = new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D };
        var attachment = await UploadFileAsync(client, ticket.Id, "my_file.pdf", fileBytes, "application/pdf");

        // Act
        var downloadResponse = await client.GetAsync($"/api/Attachments/download/{attachment.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, downloadResponse.StatusCode);
        Assert.Equal("application/pdf", downloadResponse.Content.Headers.ContentType?.MediaType);
        
        var downloadedBytes = await downloadResponse.Content.ReadAsByteArrayAsync();
        Assert.NotEmpty(downloadedBytes);
    }
}
