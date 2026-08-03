export interface AttachmentResponseDto {
    id: string;
    fileName: string;
    filePath: string;
    contentType: string;
    fileSize: number;
    ticketId?: string;
    commentId?: string;
    uploaderId?: string;
    uploaderName?: string;
    uploaderRole?: string;
    createdAt: string;
}

export interface AttachmentCreateDto {
    file: File;
    ticketId?: string;
    commentId?: string;
}
