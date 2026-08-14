import api from './api';

export interface SystemSettingsDto {
  appName: string;
  sessionTimeoutMinutes: number;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  slaCriticalResponseHours: number;
  slaCriticalResolutionHours: number;
  slaHighResponseHours: number;
  slaHighResolutionHours: number;
  slaMediumResponseHours: number;
  slaMediumResolutionHours: number;
  slaLowResponseHours: number;
  slaLowResolutionHours: number;
}

export const systemSettingsService = {
  getSettings: async (): Promise<SystemSettingsDto> => {
    const response = await api.get('/api/Settings');
    return response.data.data;
  },

  updateSettings: async (dto: SystemSettingsDto): Promise<void> => {
    await api.put('/api/Settings', dto);
  }
};
