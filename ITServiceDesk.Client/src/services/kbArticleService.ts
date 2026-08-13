import api from './api';
import type { 
    KbArticle, 
    KbArticleCreateDto, 
    KbArticleUpdateDto, 
    KbArticleFilterDto, 
    KbDashboardStatsDto,
    KbArticleFeedbackDto 
} from '../types/knowledgeBase';
import type { ApiResponse, PagedResponse } from '../types/api';

const basePath = '/api/KbArticles';

export const kbArticleService = {
    getPaged: async (filter: KbArticleFilterDto): Promise<PagedResponse<KbArticle[]>> => {
        const response = await api.get<PagedResponse<KbArticle[]>>(basePath, { params: filter });
        return response.data;
    },
    
    getById: async (id: string): Promise<KbArticle> => {
        const response = await api.get<ApiResponse<KbArticle>>(`${basePath}/${id}`);
        return response.data.data!;
    },
    
    getStats: async (): Promise<KbDashboardStatsDto> => {
        const response = await api.get<ApiResponse<KbDashboardStatsDto>>(`${basePath}/stats`);
        return response.data.data!;
    },
    
    create: async (dto: KbArticleCreateDto): Promise<KbArticle> => {
        const response = await api.post<ApiResponse<KbArticle>>(basePath, dto);
        return response.data.data!;
    },
    
    update: async (id: string, dto: KbArticleUpdateDto): Promise<KbArticle> => {
        const response = await api.put<ApiResponse<KbArticle>>(`${basePath}/${id}`, dto);
        return response.data.data!;
    },
    
    delete: async (id: string): Promise<boolean> => {
        const response = await api.delete<ApiResponse<boolean>>(`${basePath}/${id}`);
        return response.data.data!;
    },
    
    submitFeedback: async (id: string, dto: KbArticleFeedbackDto): Promise<boolean> => {
        const response = await api.post<ApiResponse<boolean>>(`${basePath}/${id}/feedback`, dto);
        return response.data.data!;
    }
};
