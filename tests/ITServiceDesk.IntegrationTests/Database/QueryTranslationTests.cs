using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Enums;
using ITServiceDesk.Data.Contexts;
using ITServiceDesk.Data.Repositories;
using ITServiceDesk.IntegrationTests.Infrastructure;
using ITServiceDesk.Service.Services;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace ITServiceDesk.IntegrationTests.Database;

public class QueryTranslationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public QueryTranslationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task ReportManager_GetDashboardMetricsAsync_ShouldTranslateToSqlAndRunSuccessfully()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ITServiceDeskDbContext>();

        // Ensure there is some data so the query actually does work (not short-circuited).
        // It should translate and not throw InvalidOperationException.
        var reportManager = new ReportManager(context);

        // Act
        // If EF Core cannot translate any of the queries inside GetDashboardMetricsAsync,
        // it will throw an InvalidOperationException when executed against the real SQL Server provider.
        var metrics = await reportManager.GetDashboardMetricsAsync();

        // Assert
        Assert.NotNull(metrics);
        // The fact that it completed without exception is the primary assertion.
    }

    [Fact]
    public async Task KbArticleRepository_GetPagedArticlesAsync_WithSearchTerm_ShouldTranslateContainsToSql()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ITServiceDeskDbContext>();

        var repository = new KbArticleRepository(context);

        // Seed an article to make sure it matches
        var category = new KbCategory { Id = Guid.NewGuid(), Name = "Search Category", Description = "Desc" };
        context.KbCategories.Add(category);

        var authorId = Guid.NewGuid();
        var author = new AppUser { Id = authorId, UserName = $"author_{authorId}", Email = "auth@test.com", FirstName = "F", LastName = "L" };
        context.Users.Add(author);

        var articleId = Guid.NewGuid();
        var article = new KbArticle
        {
            Id = articleId,
            Title = "Unique Title For Search",
            Content = "Unique content containing important keywords",
            CategoryId = category.Id,
            AuthorId = authorId,
            Status = KbArticleStatus.Published,
            Visibility = KbArticleVisibility.Both,
            ArticleType = KbArticleType.Guide
        };
        context.KbArticles.Add(article);
        await context.SaveChangesAsync();

        // Act
        // Searching for part of the title and content. This tests if .Contains() translates properly.
        var result = await repository.GetPagedArticlesAsync(
            pageNumber: 1,
            pageSize: 10,
            categoryId: null,
            searchTerm: "important",
            visibility: null,
            status: null,
            articleType: null
        );

        // Assert
        Assert.NotNull(result.Articles);
        Assert.True(result.TotalCount > 0);
        Assert.Contains(result.Articles, a => a.Id == articleId);
    }
}
