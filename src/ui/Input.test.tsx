import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './Input';

describe('Input', () => {
  it('associates the label with the control', () => {
    render(<Input label="Quantity" />);
    // getByLabelText resolves the label→input association.
    expect(screen.getByLabelText('Quantity')).toBeInTheDocument();
  });

  it('exposes error text and marks the field invalid', () => {
    render(<Input label="Quantity" error="Too many" />);
    const input = screen.getByLabelText('Quantity');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Too many');
  });

  it('shows a hint only when there is no error', () => {
    const { rerender } = render(<Input label="Q" hint="Max 10" />);
    expect(screen.getByText('Max 10')).toBeInTheDocument();
    rerender(<Input label="Q" hint="Max 10" error="Nope" />);
    expect(screen.queryByText('Max 10')).not.toBeInTheDocument();
    expect(screen.getByText('Nope')).toBeInTheDocument();
  });
});
