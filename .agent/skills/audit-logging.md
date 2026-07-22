# Skill: Implement Audit Logging
DESCRIPTION:
How to properly log user actions into the AuditLogs table.
IMPLEMENTATION INSTRUCTIONS:
1. When modifying critical entities (e.g., Tickets, Users), inject
`IAuditLogService`.
2. Capture the `OldValue` and `NewValue` (serialize to JSON if necessary).
3. The Action string should be descriptive.
Example Format: "Tunahan Demiral Ticket oluşturdu." veya "Kullanıcı
durumu Bekleyen olarak değiştirdi."
4. Always capture the current timestamp (CreatedAt) and IP Address from the
HttpContext.
CODE TEMPLATE:
await _auditLogService.LogAsync(new AuditLogDto {
UserId = currentUserId,
TicketId = ticket.Id,
Action = "Ticket oluşturuldu.",
OldValue = null,
NewValue = JsonSerializer.Serialize(ticket),
CreatedAt = DateTime.UtcNow,
IPAddress =
_httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString()
});