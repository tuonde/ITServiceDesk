import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '../../src/components/ui/EmptyState';

describe('EmptyState (Smoke Test)', () => {
  it('renders correctly with title and description', () => {
    render(
      <EmptyState 
        title="No items found" 
        description="Try adjusting your filters" 
      />
    );
    
    expect(screen.getByRole('heading', { name: /no items found/i, level: 3 })).toBeInTheDocument();
    expect(screen.getByText(/try adjusting your filters/i)).toBeInTheDocument();
  });

  it('renders action button and triggers onClick', async () => {
    const user = userEvent.setup();
    const handleAction = vi.fn();
    
    render(
      <EmptyState 
        title="Empty" 
        action={{ label: 'Create New', onClick: handleAction }} 
      />
    );
    
    const button = screen.getByRole('button', { name: /create new/i });
    expect(button).toBeInTheDocument();
    
    await user.click(button);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});
