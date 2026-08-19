import api from './api';
import type { ApiResponse } from '../types/api';

export const reportService = {
    getDashboardMetrics: async () => {
        const response = await api.get<ApiResponse<any>>('/api/Reports/dashboard');
        if (!response.data.isSuccess) {
            throw new Error(response.data.message || 'Raporlar yüklenemedi.');
        }
        return response.data.data;
    }
};
