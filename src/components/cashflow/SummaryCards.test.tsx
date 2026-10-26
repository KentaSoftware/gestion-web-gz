import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import SummaryCards from './SummaryCards';

const summary = {
  openingBalance: 10000,
  totalInflows: 5000,
  totalOutflows: 1500,
  netCashFlow: 3500,
  closingBalance: 13500,
};

describe('SummaryCards', () => {
  it('renders the five summary labels', () => {
    render(<SummaryCards summary={summary} />);

    expect(screen.getByText('Saldo inicial')).toBeInTheDocument();
    expect(screen.getByText('Total ingresos')).toBeInTheDocument();
    expect(screen.getByText('Total egresos')).toBeInTheDocument();
    expect(screen.getByText('Flujo neto')).toBeInTheDocument();
    expect(screen.getByText('Saldo final')).toBeInTheDocument();
  });

  it('formats every amount with the currency helper', () => {
    render(<SummaryCards summary={summary} />);

    expect(screen.getByText(/\$\s?10\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/\$\s?13\.500,00/)).toBeInTheDocument();
  });

  it('shows placeholders while there is no data', () => {
    render(<SummaryCards summary={null} />);

    expect(screen.getAllByText('—')).toHaveLength(5);
  });
});
