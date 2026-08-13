import api from './api';
import type { KbCategory, KbCategoryCreateDto, KbCategoryUpdateDto } from '../types/knowledgeBase';
import type { ApiResponse } from '../types/api';

const basePath = '/api/KbCategories';

export const kbCategoryService = {
    getAll: async (): Promise<KbCategory[]> => {
        const response = await api.get<ApiResponse<KbCategory[]>>(basePath);
        return response.data.data!;
    },
    
    getById: async (id: string): Promise<KbCategory> => {
        const response = await api.get<ApiResponse<KbCategory>>(`${basePath}/${id}`);
        return response.data.data!;
    },
    
    create: async (dto: KbCategoryCreateDto): Promise<KbCategory> => {
        const response = await api.post<ApiResponse<KbCategory>>(basePath, dto);
        return response.data.data!;
    },
    
    update: async (id: string, dto: KbCategoryUpdateDto): Promise<KbCategory> => {
        const response = await api.put<ApiResponse<KbCategory>>(`${basePath}/${id}`, dto);
        return response.data.data!;
    },
    
    delete: async (id: string): Promise<boolean> => {
        const response = await api.delete<ApiResponse<boolean>>(`${basePath}/${id}`);
        return response.data.data!;
    }
};
