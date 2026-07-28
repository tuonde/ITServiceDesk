import api from './api';
import type { PagedResponse, ApiResponse } from '../types/api';
import type { TicketResponseDto, TicketCreateDto, TicketFilterDto, TicketUpdateDto } from '../types/ticket';

export const ticketService = {
    getAll: async (filter?: TicketFilterDto): Promise<PagedResponse<TicketResponseDto[]>> => {
        const queryParams = new URLSearchParams();
        if (filter) {
            if (filter.pageNumber !== undefined) queryParams.append('pageNumber', filter.pageNumber.toString());
            if (filter.pageSize !== undefined) queryParams.append('pageSize', filter.pageSize.toString());
            if (filter.status !== undefined) queryParams.append('status', filter.status.toString());
            if (filter.priority !== undefined) queryParams.append('priority', filter.priority.toString());
            if (filter.deviceId) queryParams.append('deviceId', filter.deviceId);
        } else {
            queryParams.append('pageNumber', '1');
            queryParams.append('pageSize', '100');
        }

        const response = await api.get<PagedResponse<TicketResponseDto[]>>(`/api/Tickets?${queryParams.toString()}`);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message || 'Biletler yüklenemedi.');
        }
        return response.data;
    },

    create: async (data: TicketCreateDto): Promise<TicketResponseDto> => {
        const response = await api.post<ApiResponse<TicketResponseDto>>('/api/Tickets', data);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message || 'Bilet oluşturulamadı.');
        }
        return response.data.data as TicketResponseDto;
    },

    delete: async (id: string): Promise<boolean> => {
        const response = await api.delete<ApiResponse<boolean>>(`/api/Tickets/${id}`);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message || 'Bilet iptal edilemedi.');
        }
        return response.data.data as boolean;
    },

    update: async (id: string, dto: TicketUpdateDto): Promise<TicketResponseDto> => {
        try {
            const response = await api.put<ApiResponse<TicketResponseDto>>(`/api/Tickets/${id}`, dto);
            if (!response.data.isSuccess) {
                throw new Error(response.data.message || 'Bilet güncellenemedi.');
            }
            return response.data.data as TicketResponseDto;
        } catch (error: any) {
            console.error('Update failed with error response:', error.response?.data);
            throw new Error(error.response?.data?.message || JSON.stringify(error.response?.data?.errors) || error.message || 'Güncelleme başarısız');
        }
    }
};
