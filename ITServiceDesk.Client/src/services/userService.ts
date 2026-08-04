import api from './api';
import type { ApiResponse } from '../types/api';
import type { UserListDto, UserCreateDto, UserUpdateDto } from '../types/user';

export const userService = {
    getAll: async (): Promise<ApiResponse<UserListDto[]>> => {
        const response = await api.get<ApiResponse<UserListDto[]>>('/api/Users');
        return response.data;
    },

    getById: async (id: string): Promise<ApiResponse<UserListDto>> => {
        const response = await api.get<ApiResponse<UserListDto>>(`/api/Users/${id}`);
        return response.data;
    },

    create: async (data: UserCreateDto): Promise<ApiResponse<UserListDto>> => {
        try {
            const response = await api.post<ApiResponse<UserListDto>>('/api/Users', data);
            return response.data;
        } catch (error: any) {
            if (error.response && error.response.data && error.response.data.message) {
                throw new Error(error.response.data.message);
            }
            throw error;
        }
    },

    update: async (data: UserUpdateDto): Promise<ApiResponse<UserListDto>> => {
        try {
            const { id, ...rest } = data;
            const response = await api.put<ApiResponse<UserListDto>>(`/api/Users/${id}`, rest);
            return response.data;
        } catch (error: any) {
            if (error.response && error.response.data && error.response.data.message) {
                throw new Error(error.response.data.message);
            }
            throw error;
        }
    },

    toggleStatus: async (id: string): Promise<void> => {
        const response = await api.patch<ApiResponse<boolean>>(`/api/Users/${id}/toggle-status`);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message || 'Durum güncellenemedi.');
        }
    },

    delete: async (id: string): Promise<void> => {
        try {
            const response = await api.delete<ApiResponse<boolean>>(`/api/Users/${id}`);
            if (!response.data.isSuccess) {
                throw new Error(response.data.message || 'Kullanıcı silinemedi.');
            }
        } catch (error: any) {
            if (error.response && error.response.data && error.response.data.message) {
                throw new Error(error.response.data.message);
            }
            throw error;
        }
    }
};
