import api from './api';
import type { LoginDto, RegisterDto, UserResponseDto } from '../types/auth';
import type { ApiResponse } from '../types/api';

const decodeBase64Utf8 = (base64Url: string): string => {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const binString = atob(base64);
    const bytes = new Uint8Array(binString.length);
    for (let i = 0; i < binString.length; i++) {
        bytes[i] = binString.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
};

const getDecodedToken = (): any | null => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
        const payloadJson = decodeBase64Utf8(token.split('.')[1]);
        return JSON.parse(payloadJson);
    } catch {
        return null;
    }
};

export const authService = {
    login: async (data: LoginDto): Promise<string> => {
        try {
            const response = await api.post<ApiResponse<string>>('/api/Auth/login', data);
            if (!response.data.isSuccess) {
                throw new Error(response.data.message || 'GiriÅŸ baÅŸarÄ±sÄ±z.');
            }
            return response.data.data as string;
        } catch (error: any) {
            if (error.response?.data?.message) {
                throw new Error(error.response.data.message);
            }
            if (error.response?.data?.errors) {
                const firstError = Object.values(error.response.data.errors)[0] as string[];
                throw new Error(firstError[0] || 'DoÄŸrulama hatasÄ±.');
            }
            throw new Error(error.message || 'Bir hata oluÅŸtu.');
        }
    },

    register: async (data: RegisterDto): Promise<UserResponseDto> => {
        const response = await api.post<ApiResponse<UserResponseDto>>('/api/Auth/register', data);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message || 'KayÄ±t baÅŸarÄ±sÄ±z.');
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

    getUserRoles: (): string[] => {
        const payload = getDecodedToken();
        if (!payload) return [];
        const roles = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.role;
        if (!roles) return [];
        return Array.isArray(roles) ? roles : [roles];
    },

    isAdmin: (): boolean => {
        return authService.getUserRoles().includes('Admin');
    },

    isTechnician: (): boolean => {
        return authService.getUserRoles().includes('Technician');
    },

    getUserRole: (): string | null => {
        const roles = authService.getUserRoles();
        return roles.length > 0 ? roles[0] : null;
    },

    getUserId: (): string | null => {
        const payload = getDecodedToken();
        if (!payload) return null;
        return payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.nameid || payload.sub || null;
    },

    getUserFirstName: (): string | null => {
        const payload = getDecodedToken();
        if (!payload) return null;
        return payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'] || payload.given_name || null;
    },

    getUserFullName: (): string | null => {
        const payload = getDecodedToken();
        if (!payload) return null;
        const firstName = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'] || payload.given_name || '';
        const lastName = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'] || payload.family_name || '';
        return `${firstName} ${lastName}`.trim() || null;
    }
};
