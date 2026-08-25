import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Tickets from '../../src/pages/Tickets';
import { authService } from '../../src/services/authService';
import { ticketService } from '../../src/services/ticketService';
// import { deviceService } from '../../src/services/deviceService';
// import { ticketCategoryService } from '../../src/services/ticketCategoryService';
// import { userService } from '../../src/services/userService';
// import { signalrService } from '../../src/services/signalrService';

vi.mock('../../src/services/authService', () => ({
  authService: {
    isAdmin: vi.fn(),
    isTechnician: vi.fn(),
    getUserId: vi.fn().mockReturnValue('user-1'),
  }
}));

vi.mock('../../src/services/ticketService', () => ({
  ticketService: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn(),
    reopen: vi.fn(),
    getById: vi.fn(),
  }
}));

vi.mock('../../src/services/deviceService', () => ({
  deviceService: {
    getAvailable: vi.fn().mockResolvedValue([]),
  }
}));

vi.mock('../../src/services/ticketCategoryService', () => ({
  ticketCategoryService: {
    getAll: vi.fn().mockResolvedValue([{ id: 'cat-1', name: 'Software' }]),
  }
}));

vi.mock('../../src/services/userService', () => ({
  userService: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
  }
}));

vi.mock('../../src/services/signalrService', () => ({
  signalrService: {
    on: vi.fn(),
    off: vi.fn(),
  }
}));

vi.mock('../../src/services/attachmentService', () => ({
  attachmentService: {
    getByTicketId: vi.fn().mockResolvedValue([]),
  }
}));

vi.mock('../../src/services/commentService', () => ({
  commentService: {
    getByTicketId: vi.fn().mockResolvedValue([]),
  }
}));

describe('Ticket Creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderTickets = () => {
    return render(
      <MemoryRouter>
        <Tickets hideHeader={false} />
      </MemoryRouter>
    );
  };

  it('TicketCreate_WhenValidFormSubmitted_ShouldCreateTicket', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.isAdmin).mockReturnValue(false); // Normal user
    vi.mocked(ticketService.create).mockResolvedValueOnce({ id: 'ticket-1' } as any);

    renderTickets();

    // Open Modal
    const createBtn = await screen.findByRole('button', { name: /Yeni Talep Aç/i });
    await user.click(createBtn);

    // Form fields
    const titleInput = screen.getByPlaceholderText(/Örn: E-Posta hesabıma giremiyorum/i);
    const descInput = screen.getByPlaceholderText(/Detaylı bilgi veriniz/i);

    await user.type(titleInput, 'Cannot access email');
    await user.type(descInput, 'My email is not working since morning.');

    // Priorities (Q1 and Q2)
    // Soru 1: Sadece beni
    const q1Radio = screen.getByLabelText(/Sadece beni/i);
    await user.click(q1Radio);

    // Soru 2: İşimi engellemiyor
    const q2Radio = screen.getByLabelText(/İşimi engellemiyor/i);
    await user.click(q2Radio);

    // Submit button
    const submitBtn = screen.getByRole('button', { name: /Bileti Gönder/i });
    await user.click(submitBtn);

    // Assert service called correctly
    expect(ticketService.create).toHaveBeenCalledTimes(1);
    expect(ticketService.create).toHaveBeenCalledWith({
      title: 'Cannot access email',
      description: 'My email is not working since morning.',
      priority: 1, // Low priority
      categoryId: null,
      deviceId: null
    });
  });

  it('Reopen_WhenValidReasonSubmitted_ShouldCallServiceAndUpdateUi', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.isAdmin).mockReturnValue(true);
    vi.mocked(ticketService.getAll).mockResolvedValueOnce({
      data: [{ id: 'ticket-2', title: 'Closed Ticket', status: 4, createdAt: '2023-01-01', priority: 0 }],
      totalRecords: 1
    } as any);

    // Make getById return the ticket with correct structure since Reopen uses it
    vi.mocked(ticketService.reopen).mockResolvedValueOnce(undefined);
    vi.mocked(ticketService.getById).mockResolvedValueOnce({ 
      id: 'ticket-2', 
      title: 'Closed Ticket', 
      status: 4, // Closed
      createdAt: '2023-01-01',
      priority: 0 
    } as any);

    renderTickets();

    // The list loads
    const ticketRow = await screen.findByText('Closed Ticket');
    await user.click(ticketRow);

    // Modal opens, wait for Reopen button (Yeniden Aç)
    const reopenBtn = await screen.findByRole('button', { name: /Talebi Yeniden Aç \(Re-open\)/i });
    await user.click(reopenBtn);

    // Now Reopen modal is open, fill reason
    const reasonInput = screen.getByPlaceholderText('Sorun neden devam ediyor?');
    await user.type(reasonInput, 'The issue is happening again.');

    // Click submit
    const submitBtn = screen.getByRole('button', { name: 'Yeniden Aç' });
    await user.click(submitBtn);

    // Assert service called
    expect(ticketService.reopen).toHaveBeenCalledWith('ticket-2', 'The issue is happening again.');
  });
});

