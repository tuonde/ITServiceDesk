import api from './api';
import { type DeviceDto, type DeviceCreateDto, type DeviceUpdateDto } from '../types/device';

export const deviceService = {
    getAll: async () => {
        const response = await api.get<DeviceDto[]>('/api/devices');
        return response.data;
    },
    
    getById: async (id: string) => {
        const response = await api.get<DeviceDto>(`/api/devices/${id}`);
        return response.data;
    },

    create: async (data: DeviceCreateDto) => {
        const response = await api.post<DeviceDto>('/api/devices', data);
        return response.data;
    },

    update: async (id: string, data: DeviceUpdateDto) => {
        const response = await api.put<DeviceDto>(`/api/devices/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        await api.delete(`/api/devices/${id}`);
    }
};
