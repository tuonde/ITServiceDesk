using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ITServiceDesk.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSystemSettingsSlaFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SlaCriticalResolutionHours",
                table: "SystemSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SlaCriticalResponseHours",
                table: "SystemSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SlaHighResolutionHours",
                table: "SystemSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SlaHighResponseHours",
                table: "SystemSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SlaLowResolutionHours",
                table: "SystemSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SlaLowResponseHours",
                table: "SystemSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SlaMediumResolutionHours",
                table: "SystemSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SlaMediumResponseHours",
                table: "SystemSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SlaCriticalResolutionHours",
                table: "SystemSettings");

            migrationBuilder.DropColumn(
                name: "SlaCriticalResponseHours",
                table: "SystemSettings");

            migrationBuilder.DropColumn(
                name: "SlaHighResolutionHours",
                table: "SystemSettings");

            migrationBuilder.DropColumn(
                name: "SlaHighResponseHours",
                table: "SystemSettings");

            migrationBuilder.DropColumn(
                name: "SlaLowResolutionHours",
                table: "SystemSettings");

            migrationBuilder.DropColumn(
                name: "SlaLowResponseHours",
                table: "SystemSettings");

            migrationBuilder.DropColumn(
                name: "SlaMediumResolutionHours",
                table: "SystemSettings");

            migrationBuilder.DropColumn(
                name: "SlaMediumResponseHours",
                table: "SystemSettings");
        }
    }
}
