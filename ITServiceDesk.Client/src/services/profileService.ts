import api from './api';

export interface ProfileUpdateData {
    firstName: string;
    lastName: string;
    phoneNumber?: string;
}

export interface ChangePasswordData {
    currentPassword: string;
    newPassword: string;
}

export const profileService = {
    getMyProfile: async () => {
        const response = await api.get('/api/Profile');
        return response.data.data;
    },

    updateProfile: async (data: ProfileUpdateData) => {
        const response = await api.put('/api/Profile', data);
        return response.data;
    },

    changePassword: async (data: ChangePasswordData) => {
        const response = await api.post('/api/Profile/change-password', data);
        return response.data;
    }
};
