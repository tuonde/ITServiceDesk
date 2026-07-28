export interface AuditLogResponseDto {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    ticketId: string | null;
    action: string;
    oldValue: string | null;
    newValue: string | null;
    createdAt: string;
}
