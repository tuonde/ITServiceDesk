using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ITServiceDesk.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Tickets_Priority",
                table: "Tickets",
                column: "Priority");

            migrationBuilder.CreateIndex(
                name: "IX_Tickets_Status",
                table: "Tickets",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Tickets_Priority",
                table: "Tickets");

            migrationBuilder.DropIndex(
                name: "IX_Tickets_Status",
                table: "Tickets");
        }
    }
}
