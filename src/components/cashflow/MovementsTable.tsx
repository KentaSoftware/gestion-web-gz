'use client';

import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { format } from 'date-fns';
import {
  CASHFLOW_SOURCE_LABELS,
  CASHFLOW_TYPE_LABELS,
  CashflowMovement,
  CashflowMovementSource,
  CashflowMovementType,
} from '@/interfaces/cashflow.interface';
import { formatCurrency } from '@/utils/validators';

interface MovementsTableProps {
  movements: CashflowMovement[];
  pageSize?: number;
}

type SortOption = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';

const SOURCE_OPTIONS: CashflowMovementSource[] = ['sale', 'buy', 'expense'];

const DEFAULT_PAGE_SIZE = 20;

/**
 * Flat movement table with client-side filters, sorting and pagination (PS-T05).
 * Outflows are shown as positive amounts; the type column carries the direction.
 */
export default function MovementsTable({
  movements,
  pageSize = DEFAULT_PAGE_SIZE,
}: MovementsTableProps) {
  const [typeFilter, setTypeFilter] = useState<CashflowMovementType | ''>('');
  const [sourceFilter, setSourceFilter] = useState<CashflowMovementSource | ''>('');
  const [sort, setSort] = useState<SortOption>('date_desc');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const result = movements.filter(movement => {
      const matchesType = typeFilter === '' || movement.type === typeFilter;
      const matchesSource = sourceFilter === '' || movement.source === sourceFilter;
      return matchesType && matchesSource;
    });

    return result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();

      switch (sort) {
        case 'date_asc':
          return dateA - dateB;
        case 'amount_desc':
          return b.amount - a.amount;
        case 'amount_asc':
          return a.amount - b.amount;
        case 'date_desc':
        default:
          return dateB - dateA;
      }
    });
  }, [movements, sort, sourceFilter, typeFilter]);

  const totals = useMemo(() => {
    let inflows = 0;
    let outflows = 0;

    filtered.forEach(movement => {
      if (movement.type === 'inflow') inflows += movement.amount;
      else outflows += movement.amount;
    });

    return { inflows, outflows, count: filtered.length };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const updateTypeFilter = (value: CashflowMovementType | '') => {
    setTypeFilter(value);
    setPage(1);
  };

  const updateSourceFilter = (value: CashflowMovementSource | '') => {
    setSourceFilter(value);
    setPage(1);
  };

  const updateSort = (value: SortOption) => {
    setSort(value);
    setPage(1);
  };

  return (
    <Card>
      <CardHeader>
        <Title>Movimientos</Title>
        <Totals>
          <span>{totals.count} movimientos</span>
          <InflowTotal>Ingresos: {formatCurrency(totals.inflows)}</InflowTotal>
          <OutflowTotal>Egresos: {formatCurrency(totals.outflows)}</OutflowTotal>
        </Totals>
      </CardHeader>

      <Filters>
        <FieldGroup>
          <Label htmlFor="cashflow-filter-type">Tipo</Label>
          <Select
            id="cashflow-filter-type"
            value={typeFilter}
            onChange={event => updateTypeFilter(event.target.value as CashflowMovementType | '')}
          >
            <option value="">Todos</option>
            <option value="inflow">Ingresos</option>
            <option value="outflow">Egresos</option>
          </Select>
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="cashflow-filter-source">Origen</Label>
          <Select
            id="cashflow-filter-source"
            value={sourceFilter}
            onChange={event => updateSourceFilter(event.target.value as CashflowMovementSource | '')}
          >
            <option value="">Todos</option>
            {SOURCE_OPTIONS.map(source => (
              <option key={source} value={source}>
                {CASHFLOW_SOURCE_LABELS[source]}
              </option>
            ))}
          </Select>
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="cashflow-sort">Orden</Label>
          <Select
            id="cashflow-sort"
            value={sort}
            onChange={event => updateSort(event.target.value as SortOption)}
          >
            <option value="date_desc">Fecha (más reciente)</option>
            <option value="date_asc">Fecha (más antigua)</option>
            <option value="amount_desc">Importe (mayor)</option>
            <option value="amount_asc">Importe (menor)</option>
          </Select>
        </FieldGroup>
      </Filters>

      {visibleRows.length === 0 ? (
        <EmptyState>No hay movimientos que coincidan con los filtros seleccionados.</EmptyState>
      ) : (
        <>
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <Th>Fecha</Th>
                  <Th>Tipo</Th>
                  <Th>Origen</Th>
                  <Th>Descripción</Th>
                  <Th $alignRight>Importe</Th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(movement => (
                  <Tr key={`${movement.source}-${movement.sourceId}-${movement.date}`}>
                    <Td>{format(new Date(movement.date), 'dd/MM/yyyy')}</Td>
                    <Td>
                      <TypeBadge $type={movement.type}>
                        {CASHFLOW_TYPE_LABELS[movement.type]}
                      </TypeBadge>
                    </Td>
                    <Td>{CASHFLOW_SOURCE_LABELS[movement.source]}</Td>
                    <Td>{movement.description || '—'}</Td>
                    <Td $alignRight $type={movement.type}>
                      {formatCurrency(movement.amount)}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>

          <Pagination>
            <span>
              Página {currentPage} de {totalPages}
            </span>
            <PageButtons>
              <PageButton
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Anterior
              </PageButton>
              <PageButton
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                Siguiente
              </PageButton>
            </PageButtons>
          </Pagination>
        </>
      )}
    </Card>
  );
}

const Card = styled.section`
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const Title = styled.h2`
  font-size: 16px;
  font-weight: 700;
  color: #333;
  margin: 0;
`;

const Totals = styled.div`
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #666;
  flex-wrap: wrap;
`;

const InflowTotal = styled.span`
  color: #2e7d32;
  font-weight: 600;
`;

const OutflowTotal = styled.span`
  color: #c62828;
  font-weight: 600;
`;

const Filters = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
`;

const Select = styled.select`
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  color: #333;
  background: white;
  min-width: 170px;

  &:focus {
    outline: none;
    border-color: #3764a0;
  }
`;

const TableWrapper = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
`;

const Th = styled.th<{ $alignRight?: boolean }>`
  background: #f5f5f5;
  padding: 12px;
  text-align: ${props => (props.$alignRight ? 'right' : 'left')};
  font-weight: 600;
  color: #666;
  border-bottom: 2px solid #ddd;
  white-space: nowrap;
`;

const Tr = styled.tr`
  &:hover {
    background: #fafafa;
  }
`;

const Td = styled.td<{ $alignRight?: boolean; $type?: CashflowMovementType }>`
  padding: 12px;
  border-bottom: 1px solid #eee;
  text-align: ${props => (props.$alignRight ? 'right' : 'left')};
  color: ${props => {
    if (!props.$type) return '#333';
    return props.$type === 'inflow' ? '#2e7d32' : '#c62828';
  }};
  font-weight: ${props => (props.$type ? 600 : 'normal')};
  vertical-align: middle;
`;

const TypeBadge = styled.span<{ $type: CashflowMovementType }>`
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: ${props => (props.$type === 'inflow' ? '#e8f5e9' : '#fdecea')};
  color: ${props => (props.$type === 'inflow' ? '#2e7d32' : '#c62828')};
`;

const EmptyState = styled.p`
  font-size: 14px;
  color: #777;
  background: #f7f9fc;
  border: 1px dashed #cdd7e3;
  border-radius: 10px;
  padding: 24px;
  margin: 0;
  text-align: center;
`;

const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: #666;
  flex-wrap: wrap;
`;

const PageButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const PageButton = styled.button`
  padding: 7px 14px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  font-size: 13px;
  color: #3764a0;
  cursor: pointer;

  &:disabled {
    color: #bbb;
    cursor: not-allowed;
  }
`;
