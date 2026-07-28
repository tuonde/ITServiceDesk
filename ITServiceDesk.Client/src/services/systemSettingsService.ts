import api from './api';

export interface SystemSettingsDto {
  appName: string;
  sessionTimeoutMinutes: number;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
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
