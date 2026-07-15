import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Table, type Column } from './Table';

interface Row {
  id: number;
  name: string;
  qty: number;
}

const columns: Column<Row>[] = [
  { key: 'name', header: 'Name', render: (r) => r.name },
  { key: 'qty', header: 'Qty', align: 'right', render: (r) => r.qty },
];

const rows: Row[] = [
  { id: 1, name: 'Nails', qty: 120 },
  { id: 2, name: 'Whisky', qty: 4 },
];

describe('Table', () => {
  it('renders headers and a cell per column and row', () => {
    render(<Table columns={columns} rows={rows} rowKey={(r) => r.id} />);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByText('Nails')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('Whisky')).toBeInTheDocument();
  });

  it('renders the empty slot when there are no rows', () => {
    render(
      <Table
        columns={columns}
        rows={[]}
        rowKey={(r) => r.id}
        empty={<span>No items</span>}
      />,
    );
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('fires onRowClick with the clicked row', async () => {
    const onRowClick = vi.fn();
    render(
      <Table columns={columns} rows={rows} rowKey={(r) => r.id} onRowClick={onRowClick} />,
    );
    await userEvent.click(screen.getByText('Whisky'));
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
  });
});
