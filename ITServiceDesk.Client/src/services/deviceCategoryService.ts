import api from './api';
import { type DeviceCategoryDto } from '../types/device';

export const deviceCategoryService = {
    getAll: async () => {
        const response = await api.get<DeviceCategoryDto[]>('/api/deviceCategories');
        return response.data;
    },
    
    create: async (name: string, description?: string) => {
        const response = await api.post<DeviceCategoryDto>('/api/deviceCategories', { name, description });
        return response.data;
    }
};
