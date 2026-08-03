export interface CommentResponseDto {
    id: string;
    ticketId: string;
    userId: string;
    userName: string;
    userRole: string;
    content: string;
    createdAt: string;
}

export interface CommentCreateDto {
    ticketId: string;
    userId: string;
    content: string;
}
