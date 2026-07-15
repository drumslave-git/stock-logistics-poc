import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccessGate } from './AccessGate';

// SHA-256("hello").
const HELLO = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';

afterEach(() => {
  vi.unstubAllEnvs();
  localStorage.clear();
});

describe('AccessGate', () => {
  it('renders children directly when the gate is disabled', () => {
    vi.stubEnv('VITE_ACCESS_TOKEN_HASH', '');
    render(
      <AccessGate>
        <div>secret app</div>
      </AccessGate>,
    );
    expect(screen.getByText('secret app')).toBeInTheDocument();
  });

  it('hides children until the correct token is entered', async () => {
    vi.stubEnv('VITE_ACCESS_TOKEN_HASH', HELLO);
    const user = userEvent.setup();
    render(
      <AccessGate>
        <div>secret app</div>
      </AccessGate>,
    );

    expect(screen.queryByText('secret app')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/access token/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /unlock/i }));
    expect(await screen.findByText('That token is not correct.')).toBeInTheDocument();
    expect(screen.queryByText('secret app')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/access token/i), 'hello');
    await user.click(screen.getByRole('button', { name: /unlock/i }));
    expect(await screen.findByText('secret app')).toBeInTheDocument();
  });
});
