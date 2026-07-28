import api from './api';
import type { LoginDto, RegisterDto, UserResponseDto } from '../types/auth';
import type { ApiResponse } from '../types/api';

export const authService = {
    login: async (data: LoginDto): Promise<string> => {
        try {
            const response = await api.post<ApiResponse<string>>('/api/Auth/login', data);
            if (!response.data.isSuccess) {
                throw new Error(response.data.message || 'Giriş başarısız.');
            }
            return response.data.data as string;
        } catch (error: any) {
            if (error.response?.data?.message) {
                throw new Error(error.response.data.message);
            }
            if (error.response?.data?.errors) {
                const firstError = Object.values(error.response.data.errors)[0] as string[];
                throw new Error(firstError[0] || 'Doğrulama hatası.');
            }
            throw new Error(error.message || 'Bir hata oluştu.');
        }
    },

    register: async (data: RegisterDto): Promise<UserResponseDto> => {
        const response = await api.post<ApiResponse<UserResponseDto>>('/api/Auth/register', data);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message || 'Kayıt başarısız.');
        }
        return response.data.data as UserResponseDto;
    },

    logout: () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    },

    isAuthenticated: (): boolean => {
        return !!localStorage.getItem('token');
    },

    getUserRole: (): string | null => {
        const token = localStorage.getItem('token');
        if (!token) return null;
        try {
            const payloadBase64 = token.split('.')[1];
            const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
            const payload = JSON.parse(payloadJson);
            return payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.role || null;
        } catch (e) {
            return null;
        }
    },

    getUserId: (): string | null => {
        const token = localStorage.getItem('token');
        if (!token) return null;
        try {
            const payloadBase64 = token.split('.')[1];
            const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
            const payload = JSON.parse(payloadJson);
            return payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.nameid || payload.sub || null;
        } catch (e) {
            return null;
        }
    }
};
