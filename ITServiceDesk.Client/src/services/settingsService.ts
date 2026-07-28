import api from './api';

export const settingsService = {
    uploadLogo: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await api.post('/api/Settings/upload-logo', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    getLogoUrl: async () => {
        const response = await api.get('/api/Settings/logo-url');
        return response.data.data;
    }
};
