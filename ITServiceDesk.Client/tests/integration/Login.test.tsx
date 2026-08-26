import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from '../../src/pages/Login';
import { authService } from '../../src/services/authService';

// Mock authService
vi.mock('../../src/services/authService', () => ({
  authService: {
    login: vi.fn(),
  }
}));

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('Login_WhenCredentialsAreInvalid_ShouldShowError', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.login).mockRejectedValueOnce(new Error('Geçersiz kimlik bilgileri'));

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    // Doldur
    await user.type(screen.getByPlaceholderText('ornek@sirket.com'), 'test@test.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrongpass');
    
    // Submit
    await user.click(screen.getByRole('button', { name: /Giriş Yap/i }));

    // Assert
    expect(authService.login).toHaveBeenCalledWith({ email: 'test@test.com', password: 'wrongpass' });
    
    // Hata mesajının görünmesini bekle
    expect(await screen.findByText('Geçersiz kimlik bilgileri')).toBeInTheDocument();
    
    // Token set edilmedi
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('Login_WhenCredentialsAreValid_ShouldNavigateToExpectedPage', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.login).mockResolvedValueOnce('fake-jwt-token');

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText('ornek@sirket.com'), 'admin@test.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'CorrectPass123!');
    
    await user.click(screen.getByRole('button', { name: /Giriş Yap/i }));

    // Assert
    expect(authService.login).toHaveBeenCalledTimes(1);
    
    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('fake-jwt-token');
    });
  });
});
