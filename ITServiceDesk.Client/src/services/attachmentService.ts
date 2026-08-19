import api from './api';
import type { ApiResponse } from '../types/api';
import type { AttachmentResponseDto, AttachmentCreateDto } from '../types/attachment';

export const attachmentService = {
    getByTicketId: async (ticketId: string): Promise<AttachmentResponseDto[]> => {
        const response = await api.get<ApiResponse<AttachmentResponseDto[]>>(`/api/Attachments/ticket/${ticketId}`);
        return response.data.data!;
    },

    upload: async (data: AttachmentCreateDto): Promise<AttachmentResponseDto> => {
        const formData = new FormData();
        formData.append('File', data.file);
        if (data.ticketId) formData.append('TicketId', data.ticketId);
        if (data.commentId) formData.append('CommentId', data.commentId);

        const response = await api.post<ApiResponse<AttachmentResponseDto>>('/api/Attachments', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data.data!;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/api/Attachments/${id}`);
    },

    download: async (id: string, fileName: string): Promise<void> => {
        const response = await api.get(`/api/Attachments/download/${id}`, {
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    }
};
