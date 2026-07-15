import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import StocksPage from './StocksPage';
import { resetData } from '../api';
import { stocks as stockFixtures } from '../data/fixtures';

beforeEach(async () => {
  await resetData();
});

describe('StocksPage', () => {
  it('renders a row per seeded stock with its totals', async () => {
    render(
      <MemoryRouter>
        <StocksPage />
      </MemoryRouter>,
    );

    // Header renders immediately; rows arrive after the async load.
    expect(screen.getByRole('heading', { name: 'Stocks' })).toBeInTheDocument();
    expect(await screen.findByText(stockFixtures[0].name)).toBeInTheDocument();
    expect(screen.getByText('Odesa Port Warehouse')).toBeInTheDocument();
    expect(screen.getByText('Batumi Terminal')).toBeInTheDocument();
  });
});
