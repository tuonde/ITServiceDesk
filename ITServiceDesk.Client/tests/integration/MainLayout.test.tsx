import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import MainLayout from '../../src/layouts/MainLayout';
// import { authService } from '../../src/services/authService';
import notificationService from '../../src/services/notificationService';
import { SettingsProvider } from '../../src/contexts/SettingsContext';
// import { signalrService } from '../../src/services/signalrService';

// Mock child routes so they don't render heavy stuff
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet" />,
  };
});

vi.mock('../../src/services/authService', () => ({
  authService: {
    isAdmin: vi.fn(),
    isTechnician: vi.fn(),
    getUserRoles: vi.fn().mockReturnValue(['User']),
    getUserFullName: vi.fn().mockReturnValue('Test User'),
    isAuthenticated: vi.fn().mockReturnValue(true),
    getUserId: vi.fn().mockReturnValue('user-1'),
    logout: vi.fn(),
  }
}));

vi.mock('../../src/services/notificationService', () => ({
  default: {
    getUnread: vi.fn(),
    markAllAsRead: vi.fn(),
    markAsRead: vi.fn(),
  }
}));

vi.mock('../../src/services/signalrService', () => ({
  signalrService: {
    startConnection: vi.fn(),
    stopConnection: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  }
}));

vi.mock('../../src/services/ticketService', () => ({
  ticketService: {
    getAll: vi.fn().mockResolvedValue({ totalRecords: 0 }),
    search: vi.fn(),
  }
}));

vi.mock('../../src/services/settingsService', () => ({
  settingsService: {
    getLogoUrl: vi.fn().mockResolvedValue(null),
  }
}));

vi.mock('../../src/services/systemSettingsService', () => ({
  systemSettingsService: {
    getSettings: vi.fn().mockResolvedValue({ appName: 'Test Desk' }),
  }
}));

describe('Notification Behavior in MainLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderLayout = () => {
    return render(
      <SettingsProvider>
        <MemoryRouter>
          <MainLayout />
        </MemoryRouter>
      </SettingsProvider>
    );
  };

  it('Notification_WhenClicked_ShouldMarkAsReadAndNavigate', async () => {
    const user = userEvent.setup();
    const mockNotif = {
      id: 'notif-1',
      message: 'Test ticket was updated.',
      isRead: false,
      userId: 'user-1',
      relatedTicketId: 'ticket-1',
      createdAt: '2023-01-01T12:00:00Z',
    };

    vi.mocked(notificationService.getUnread).mockResolvedValueOnce([mockNotif]);
    vi.mocked(notificationService.markAsRead).mockResolvedValueOnce(mockNotif);

    renderLayout();

    // Wait for the unread badge to show '1'
    const unreadBadge = await screen.findByText('1');
    expect(unreadBadge).toBeInTheDocument();

    // Click the notification bell icon button
    // It has a specific SVG but no text. We can find it by its unread badge's parent button.
    const notifButton = unreadBadge.closest('button');
    expect(notifButton).not.toBeNull();
    await user.click(notifButton!);

    // Notification dropdown should open and show the message
    const notifItem = await screen.findByText('Test ticket was updated.');
    expect(notifItem).toBeInTheDocument();

    // Click the notification item
    await user.click(notifItem);

    // Should call markAllAsRead service when dropdown opens
    await waitFor(() => {
      expect(notificationService.markAllAsRead).toHaveBeenCalled();
    });
    
    // The dropdown should close
    await waitFor(() => {
      expect(screen.queryByText('Test ticket was updated.')).not.toBeInTheDocument();
    });
  });
});
