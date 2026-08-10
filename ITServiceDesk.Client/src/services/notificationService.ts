import api from './api';

export interface NotificationDto {
  id: string;
  message: string;
  isRead: boolean;
  userId: string;
  relatedTicketId: string | null;
  createdAt: string;
}

const notificationService = {
  getUnread: async (): Promise<NotificationDto[]> => {
    const response = await api.get(`/api/notifications/unread`);
    return response.data.data;
  },

  getAll: async (userId: string): Promise<NotificationDto[]> => {
    const response = await api.get(`/api/notifications/user/${userId}/all`);
    return response.data.data;
  },

  markAsRead: async (id: string): Promise<NotificationDto> => {
    const response = await api.put(`/api/notifications/${id}/read`);
    return response.data.data;
  },

  markAllAsRead: async (): Promise<string> => {
    const response = await api.put(`/api/notifications/mark-as-read`);
    return response.data.data;
  }
};

export default notificationService;
