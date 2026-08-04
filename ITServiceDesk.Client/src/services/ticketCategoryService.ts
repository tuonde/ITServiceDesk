import api from './api';
import { type TicketCategoryDto, type TicketCategoryCreateDto, type TicketCategoryUpdateDto } from '../types/ticketCategory';
import { type ApiResponse } from '../types/api';

export const ticketCategoryService = {
    getAll: async () => {
        const response = await api.get<ApiResponse<TicketCategoryDto[]>>('/api/TicketCategories');
        return response.data.data || [];
    },
    
    getById: async (id: string) => {
        const response = await api.get<ApiResponse<TicketCategoryDto>>(`/api/TicketCategories/${id}`);
        return response.data.data;
    },

    create: async (data: TicketCategoryCreateDto) => {
        const response = await api.post<ApiResponse<TicketCategoryDto>>('/api/TicketCategories', data);
        return response.data.data;
    },

    update: async (id: string, data: TicketCategoryUpdateDto) => {
        const response = await api.put<ApiResponse<TicketCategoryDto>>(`/api/TicketCategories/${id}`, data);
        return response.data.data;
    },

    delete: async (id: string) => {
        await api.delete(`/api/TicketCategories/${id}`);
    }
};
