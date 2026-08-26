using System;
using System.Linq;
using System.Threading.Tasks;
using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Enums;
using ITServiceDesk.Data.Contexts;
using ITServiceDesk.IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace ITServiceDesk.IntegrationTests.Database;

public class RelationalConstraintTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public RelationalConstraintTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Ticket_AssigneeForeignKey_WhenAssigneeDeleted_ShouldSetAssigneeIdNull()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ITServiceDeskDbContext>();

        var assigneeId = Guid.NewGuid();
        var assignee = new AppUser
        {
            Id = assigneeId,
            UserName = $"assignee_{assigneeId}@test.com",
            Email = $"assignee_{assigneeId}@test.com",
            FirstName = "Test",
            LastName = "Assignee"
        };
        context.Users.Add(assignee);
        await context.SaveChangesAsync();

        var requesterId = Guid.NewGuid();
        var requester = new AppUser
        {
            Id = requesterId,
            UserName = $"requester_{requesterId}@test.com",
            Email = $"requester_{requesterId}@test.com",
            FirstName = "Test",
            LastName = "Requester"
        };
        context.Users.Add(requester);

        var ticketId = Guid.NewGuid();
        var ticket = new Ticket
        {
            Id = ticketId,
            Title = "Test Ticket for Assignee Deletion",
            Description = "Desc",
            Status = TicketStatus.Open,
            Priority = Priority.Medium,
            RequesterId = requesterId,
            AssigneeId = assigneeId // Assign the user
        };
        context.Tickets.Add(ticket);
        await context.SaveChangesAsync();

        // Precondition
        var preCheckTicket = await context.Tickets.FindAsync(ticketId);
        Assert.NotNull(preCheckTicket);
        Assert.Equal(assigneeId, preCheckTicket.AssigneeId);

        // Act - Delete the user
        // Identity user deletion might have other constraints in a real system, but we only have standard EF configuration here.
        // If this fails, it means another restrictive FK exists.
        context.Users.Remove(assignee);
        await context.SaveChangesAsync();

        // Assert
        context.ChangeTracker.Clear();
        var postCheckTicket = await context.Tickets.FindAsync(ticketId);
        
        Assert.NotNull(postCheckTicket);
        Assert.Null(postCheckTicket.AssigneeId); // The SetNull behavior
    }

    [Fact]
    public async Task Attachment_TicketForeignKey_WhenTicketHasAttachment_ShouldRejectTicketDelete()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ITServiceDeskDbContext>();

        var requesterId = Guid.NewGuid();
        var requester = new AppUser
        {
            Id = requesterId,
            UserName = $"req2_{requesterId}@test.com",
            Email = $"req2_{requesterId}@test.com",
            FirstName = "Test2",
            LastName = "Requester2"
        };
        context.Users.Add(requester);

        var ticketId = Guid.NewGuid();
        var ticket = new Ticket
        {
            Id = ticketId,
            Title = "Test Ticket for Attachment Restrict",
            Description = "Desc",
            Status = TicketStatus.Open,
            Priority = Priority.Medium,
            RequesterId = requesterId
        };
        context.Tickets.Add(ticket);

        var attachmentId = Guid.NewGuid();
        var attachment = new Attachment
        {
            Id = attachmentId,
            FileName = "test.txt",
            FilePath = "/files/test.txt",
            ContentType = "text/plain",
            TicketId = ticketId // Link to ticket
        };
        context.Attachments.Add(attachment);
        
        await context.SaveChangesAsync();

        // Precondition
        context.ChangeTracker.Clear();
        var preCheckTicket = await context.Tickets.FindAsync(ticketId);
        Assert.NotNull(preCheckTicket);

        // Act & Assert
        // The attempt to delete the ticket should fail because of the Restrict behavior on the Attachment FK
        context.Tickets.Remove(preCheckTicket);
        
        await Assert.ThrowsAsync<DbUpdateException>(async () => 
        {
            await context.SaveChangesAsync();
        });

        // Verify DB State
        context.ChangeTracker.Clear();
        var postCheckTicket = await context.Tickets.FindAsync(ticketId);
        var postCheckAttachment = await context.Attachments.FindAsync(attachmentId);

        Assert.NotNull(postCheckTicket); // Ticket must still exist
        Assert.NotNull(postCheckAttachment); // Attachment must still exist
        Assert.Equal(ticketId, postCheckAttachment.TicketId); // Relation remains intact
    }

    [Fact]
    public async Task KbFeedback_UniqueConstraint_ShouldRejectDuplicateUserArticle()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ITServiceDeskDbContext>();

        var userId1 = Guid.NewGuid();
        var user1 = new AppUser { Id = userId1, UserName = $"u1_{userId1}", Email = "u1@test.com", FirstName = "F1", LastName = "L1" };
        
        var userId2 = Guid.NewGuid();
        var user2 = new AppUser { Id = userId2, UserName = $"u2_{userId2}", Email = "u2@test.com", FirstName = "F2", LastName = "L2" };
        
        context.Users.AddRange(user1, user2);

        var categoryId = Guid.NewGuid();
        var category = new KbCategory { Id = categoryId, Name = $"Cat_{categoryId}", Description = "Desc" };
        context.KbCategories.Add(category);

        var articleId = Guid.NewGuid();
        var article = new KbArticle 
        { 
            Id = articleId, 
            Title = "Unique Constraint Test Article", 
            Content = "Content",
            CategoryId = categoryId,
            AuthorId = userId1
        };
        context.KbArticles.Add(article);
        await context.SaveChangesAsync();

        // 1. First user feedback - Should succeed
        var feedback1 = new KbArticleFeedback { Id = Guid.NewGuid(), ArticleId = articleId, UserId = userId1, IsHelpful = true };
        context.KbArticleFeedbacks.Add(feedback1);
        await context.SaveChangesAsync();

        // 2. Different user feedback - Should succeed
        var feedback2 = new KbArticleFeedback { Id = Guid.NewGuid(), ArticleId = articleId, UserId = userId2, IsHelpful = false };
        context.KbArticleFeedbacks.Add(feedback2);
        await context.SaveChangesAsync();

        // 3. First user tries to add duplicate feedback - Should fail
        var feedbackDuplicate = new KbArticleFeedback { Id = Guid.NewGuid(), ArticleId = articleId, UserId = userId1, IsHelpful = false };
        context.KbArticleFeedbacks.Add(feedbackDuplicate);

        // Act & Assert
        await Assert.ThrowsAsync<DbUpdateException>(async () => 
        {
            await context.SaveChangesAsync();
        });

        // Verify DB State
        context.ChangeTracker.Clear();
        var finalFeedbackCount = await context.KbArticleFeedbacks
            .CountAsync(f => f.ArticleId == articleId && f.UserId == userId1);

        Assert.Equal(1, finalFeedbackCount); // Only the first feedback must exist
    }
}
