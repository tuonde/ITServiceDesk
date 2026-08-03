import api from './api';
import type { ApiResponse } from '../types/api';
import type { CommentResponseDto, CommentCreateDto } from '../types/comment';

export const commentService = {
    getByTicketId: async (ticketId: string): Promise<CommentResponseDto[]> => {
        const response = await api.get<ApiResponse<CommentResponseDto[]>>(`/api/Comments/ticket/${ticketId}`);
        return response.data.data;
    },

    create: async (data: CommentCreateDto): Promise<CommentResponseDto> => {
        const response = await api.post<ApiResponse<CommentResponseDto>>('/api/Comments', data);
        return response.data.data;
    }
};
