import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders its content', () => {
    render(<Badge>Low on</Badge>);
    expect(screen.getByText('Low on')).toBeInTheDocument();
  });

  it('applies tone-specific classes', () => {
    render(<Badge tone="danger">Alert</Badge>);
    expect(screen.getByText('Alert')).toHaveClass('bg-danger-50', 'text-danger-700');
  });
});
