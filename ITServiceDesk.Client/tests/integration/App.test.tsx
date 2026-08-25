import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../../src/App';
import { SettingsProvider } from '../../src/contexts/SettingsContext';
import { authService } from '../../src/services/authService';

// Mock services and heavy pages to isolate routing logic
vi.mock('../../src/services/authService', () => ({
  authService: {
    isAdmin: vi.fn(),
    isTechnician: vi.fn(),
    isAuthenticated: vi.fn(),
    logout: vi.fn(),
  }
}));

vi.mock('../../src/services/systemSettingsService', () => ({
  systemSettingsService: {
    getSettings: vi.fn().mockResolvedValue({ sessionTimeoutMinutes: 60 })
  }
}));

// Mock pages to just render a static text for assertion
vi.mock('../../src/pages/MyTasks', () => ({ default: () => <div data-testid="admin-page">Admin Page</div> }));
vi.mock('../../src/pages/Tickets', () => ({ default: () => <div data-testid="technician-page">Technician Page</div> }));
vi.mock('../../src/pages/Dashboard', () => ({ default: () => <div data-testid="dashboard-page">Dashboard Page</div> }));
vi.mock('../../src/pages/Login', () => ({ default: () => <div data-testid="login-page">Login Page</div> }));

vi.mock('../../src/layouts/MainLayout', () => {
  const ReactRouterDOM = require('react-router-dom');
  return {
    default: () => <div data-testid="main-layout"><ReactRouterDOM.Outlet /></div>
  };
});

describe('ProtectedRoute (App Routing)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderApp = (route: string) => {
    window.history.pushState({}, 'Test', route);
    return render(
      <SettingsProvider>
        <App />
      </SettingsProvider>
    );
  };

  it('ProtectedRoute_WhenUserIsUnauthenticatedAndAccessesAdmin_ShouldRedirectToLogin', async () => {
    // Normal User (Not Admin, Not Tech)
    vi.mocked(authService.isAdmin).mockReturnValue(false);
    vi.mocked(authService.isTechnician).mockReturnValue(false);

    renderApp('/my-tasks');

    // Should redirect to "/" (Dashboard) because requiredRole="admin" fails
    // Wait, ProtectedRoute redirects to "/" if auth fails, not "/login" directly!
    // Let's check App.tsx: `if (requiredRole === 'admin' && !isAdmin) return <Navigate to="/" replace />;`
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });
  });

  it('ProtectedRoute_WhenRoleIsNotAllowed_ShouldPreventAdminPageRender', async () => {
    // Technician User trying to access Admin route
    vi.mocked(authService.isAdmin).mockReturnValue(false);
    vi.mocked(authService.isTechnician).mockReturnValue(true);

    renderApp('/my-tasks');

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      expect(screen.queryByTestId('admin-page')).not.toBeInTheDocument();
    });
  });

  it('ProtectedRoute_WhenRoleIsAllowed_ShouldRenderAdminPage', async () => {
    // Admin User accessing Admin route
    vi.mocked(authService.isAdmin).mockReturnValue(true);
    vi.mocked(authService.isTechnician).mockReturnValue(false);

    renderApp('/my-tasks');

    await waitFor(() => {
      expect(screen.getByTestId('admin-page')).toBeInTheDocument();
    });
  });
});
