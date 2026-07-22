# Skill: Handle File Attachments
DESCRIPTION:
How to handle file uploads for Ticket attachments (e.g., SAPError.png).
IMPLEMENTATION INSTRUCTIONS:
1. Accept `IFormFile` in the API endpoint.
2. Validate file extension (only
allow .png, .jpg, .jpeg, .pdf, .txt, .log).
3. Generate a unique filename using Guid (e.g., `ticket153_f47ac10b.png`)
to avoid collisions.
4. Save the physical file to `wwwroot/attachments/`.
5. Save the relative path and original file name to the `Attachments` table
linked to the specific TicketId.
CODE TEMPLATE:
var extension = Path.GetExtension(file.FileName);
var newFileName = $"{ticketId}_{Guid.NewGuid()}{extension}";
var filePath = Path.Combine(_env.WebRootPath, "attachments", newFileName);
using (var stream = new FileStream(filePath, FileMode.Create))
{
await file.CopyToAsync(stream);
}