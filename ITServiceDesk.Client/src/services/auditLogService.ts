import api from './api';
import type { PagedResponse } from '../types/api';
import type { AuditLogResponseDto } from '../types/auditLog';

export const auditLogService = {
    getAll: async (pageNumber: number = 1, pageSize: number = 50, startDate?: string, endDate?: string, action?: string): Promise<PagedResponse<AuditLogResponseDto[]>> => {
        const response = await api.get<PagedResponse<AuditLogResponseDto[]>>('/api/AuditLogs', {
            params: { pageNumber, pageSize, startDate, endDate, action }
        });
        return response.data;
    }
};
