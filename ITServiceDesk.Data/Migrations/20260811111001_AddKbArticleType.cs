using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ITServiceDesk.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddKbArticleType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ArticleType",
                table: "KbArticles",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ArticleType",
                table: "KbArticles");
        }
    }
}
