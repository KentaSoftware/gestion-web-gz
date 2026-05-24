'use client'
import styled from 'styled-components'
import type { CashflowMovement } from '@/interfaces/cashflow.interface'

interface CashflowMovementsTableProps {
  movements: CashflowMovement[]
  loading: boolean
}

const formatAmount = (amount: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

const SOURCE_LABELS: Record<string, string> = {
  sale: 'Venta',
  buy: 'Compra',
  expense: 'Egreso',
}

export function CashflowMovementsTable({ movements, loading }: CashflowMovementsTableProps) {
  return (
    <Container>
      <SectionTitle>Movimientos del período</SectionTitle>
      {loading ? (
        <LoadingText>Cargando movimientos...</LoadingText>
      ) : movements.length === 0 ? (
        <EmptyState>
          <EmptyIcon>💸</EmptyIcon>
          <EmptyText>No hay movimientos en el período seleccionado</EmptyText>
        </EmptyState>
      ) : (
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Descripción</Th>
                <Th>Fuente</Th>
                <Th>Tipo</Th>
                <Th>Monto</Th>
              </tr>
            </thead>
            <tbody>
              {movements.map((mov, index) => (
                <tr key={`${mov.sourceId}-${index}`}>
                  <Td>{formatDate(mov.date)}</Td>
                  <Td>
                    <DescriptionCell title={mov.description}>{mov.description}</DescriptionCell>
                  </Td>
                  <Td>
                    <SourceBadge>{SOURCE_LABELS[mov.source] ?? mov.source}</SourceBadge>
                  </Td>
                  <Td>
                    <TypeBadge $type={mov.type}>
                      {mov.type === 'inflow' ? 'Ingreso' : 'Egreso'}
                    </TypeBadge>
                  </Td>
                  <Td>
                    <Amount $type={mov.type}>
                      {mov.type === 'inflow' ? '+' : '-'}{formatAmount(mov.amount)}
                    </Amount>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrapper>
      )}
    </Container>
  )
}

const Container = styled.div`
  background: white;
  border-radius: 10px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
`

const SectionTitle = styled.h2`
  color: #3764A0;
  font-size: 20px;
  margin: 0 0 20px 0;
`

const LoadingText = styled.p`
  color: #999;
  font-size: 14px;
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
`

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
`

const EmptyText = styled.p`
  color: #666;
  font-size: 16px;
  text-align: center;
`

const TableWrapper = styled.div`
  overflow-x: auto;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`

const Th = styled.th`
  text-align: left;
  padding: 12px;
  border-bottom: 2px solid #e0e0e0;
  color: #666;
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
`

const Td = styled.td`
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
`

const DescriptionCell = styled.span`
  display: block;
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const SourceBadge = styled.span`
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 10px;
  background: #EDE7F6;
  color: #4527A0;
  font-weight: 500;
`

const TypeBadge = styled.span<{ $type: string }>`
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 10px;
  background: ${({ $type }) => ($type === 'inflow' ? '#E8F5E9' : '#FFEBEE')};
  color: ${({ $type }) => ($type === 'inflow' ? '#2E7D32' : '#C62828')};
`

const Amount = styled.span<{ $type: string }>`
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  color: ${({ $type }) => ($type === 'inflow' ? '#4CAF50' : '#E57373')};
`
