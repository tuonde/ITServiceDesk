import api from './api';
import type { ApiResponse } from '../types/api';
import type { DepartmentResponseDto } from '../types/department';

export const departmentService = {
    getAll: async (): Promise<ApiResponse<DepartmentResponseDto[]>> => {
        const response = await api.get<ApiResponse<DepartmentResponseDto[]>>('/api/Departments');
        return response.data;
    },
    create: async (data: { name: string; description?: string }) => {
        const response = await api.post('/api/Departments', data);
        return response.data;
    },
    update: async (id: string, data: { name: string; description?: string }) => {
        const response = await api.put(`/api/Departments/${id}`, data);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await api.delete(`/api/Departments/${id}`);
        return response.data;
    }
};
