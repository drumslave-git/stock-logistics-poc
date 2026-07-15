import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import OrderPage from './OrderPage';
import { addToCart, resetData } from '../api';
import { items as itemFixtures, stocks as stockFixtures } from '../data/fixtures';

beforeEach(async () => {
  await resetData();
});

describe('OrderPage', () => {
  it('shows the empty state when there is no cart', async () => {
    render(
      <MemoryRouter>
        <OrderPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Your order is empty')).toBeInTheDocument();
  });

  it('auto-allocates a cart line and places the order', async () => {
    await addToCart(stockFixtures[0].id, itemFixtures[0].id, 2);

    render(
      <MemoryRouter>
        <OrderPage />
      </MemoryRouter>,
    );

    // Plan loads → the ordered item and target stock are shown.
    expect(await screen.findByText(itemFixtures[0].name)).toBeInTheDocument();
    expect(screen.getByText('Allocated')).toBeInTheDocument();

    // Auto-allocation fully covers the line, so confirm becomes enabled.
    const confirm = await screen.findByRole('button', { name: 'Confirm order' });
    await waitFor(() => expect(confirm).toBeEnabled());

    await userEvent.click(confirm);

    expect(await screen.findByRole('heading', { name: 'Order placed' })).toBeInTheDocument();
  });
});
