using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ITServiceDesk.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAttachmentUploader : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HasUnreadAdminMessage",
                table: "Tickets");

            migrationBuilder.DropColumn(
                name: "HasUnreadUserMessage",
                table: "Tickets");

            migrationBuilder.DropColumn(
                name: "UploaderName",
                table: "Attachments");

            migrationBuilder.AlterColumn<Guid>(
                name: "UploaderId",
                table: "Attachments",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.CreateIndex(
                name: "IX_Attachments_UploaderId",
                table: "Attachments",
                column: "UploaderId");

            migrationBuilder.Sql("UPDATE Attachments SET UploaderId = NULL;");

            migrationBuilder.AddForeignKey(
                name: "FK_Attachments_AspNetUsers_UploaderId",
                table: "Attachments",
                column: "UploaderId",
                principalTable: "AspNetUsers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Attachments_AspNetUsers_UploaderId",
                table: "Attachments");

            migrationBuilder.DropIndex(
                name: "IX_Attachments_UploaderId",
                table: "Attachments");

            migrationBuilder.AddColumn<bool>(
                name: "HasUnreadAdminMessage",
                table: "Tickets",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasUnreadUserMessage",
                table: "Tickets",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<Guid>(
                name: "UploaderId",
                table: "Attachments",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UploaderName",
                table: "Attachments",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}
