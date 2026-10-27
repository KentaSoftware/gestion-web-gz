'use client';

import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import apiClient from '@/utils/client';
import { formatCurrency } from '@/utils/validators';
import { providerLabel } from '@/utils/providerLabel';
import { providerService } from '@/services/provider.service';
import { Provider } from '@/interfaces/purchaseDoc.interface';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Permission } from '@/interfaces/auth.interface';
import { usePermission } from '@/hooks/usePermission';

interface BuyHeader {
  _id?: string;
  estado?: string;
  proveedor?: string;
  total?: number;
  createdAt?: string;
  docNumber?: string;
}

interface BuyItem {
  _id?: string;
  idProducto?: string;
  descripcion?: string;
  cantidad?: number;
  precio?: number;
  total?: number;
}

interface BuyDetailResponse {
  r?: BuyHeader;
  itemsBuy?: BuyItem[];
}

const ESTADO_LABELS: Record<string, string> = {
  activo: 'Activa',
  paid: 'Pagada',
  pagado: 'Pagada',
  anulado: 'Anulada',
};

function BuyDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const { hasPermission } = usePermission();
  const canUpdate = hasPermission(Permission.UPDATE_BUY);

  const [buy, setBuy] = useState<BuyHeader | null>(null);
  const [items, setItems] = useState<BuyItem[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const { data } = await apiClient.get<BuyDetailResponse>(`/buy/${id}`);

      if (!data || !data.r) {
        setNotFound(true);
        setBuy(null);
        setItems([]);
        return;
      }

      setBuy(data.r);
      setItems(Array.isArray(data.itemsBuy) ? data.itemsBuy : []);
    } catch (requestError: unknown) {
      const status = (requestError as { response?: { status?: number } })?.response?.status;

      if (status === 404) {
        setNotFound(true);
      } else if (status === 403) {
        setError('No tenés permisos para ver esta compra.');
      } else if (status === 401) {
        setError('Tu sesión expiró. Volvé a iniciar sesión.');
      } else {
        setError('No se pudo cargar la compra. Intentá nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;

    providerService
      .getProviders()
      .then((list) => {
        if (!cancelled) setProviders(list);
      })
      .catch(() => {
        if (!cancelled) setProviders([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const proveedorLabel = providerLabel(providers, buy?.proveedor);

  const itemsTotal = items.reduce((sum, item) => sum + (item.total ?? 0), 0);
  const headerTotal = typeof buy?.total === 'number' ? buy.total : 0;
  const totalMismatch = !loading && buy !== null && Math.abs(itemsTotal - headerTotal) > 0.01;

  if (loading) {
    return (
      <Container>
        <Notice>Cargando compra…</Notice>
      </Container>
    );
  }

  if (notFound) {
    return (
      <Container>
        <Notice>Compra no encontrada.</Notice>
        <Actions>
          <PrimaryButton type="button" onClick={() => router.push('/buy')}>
            Volver al listado de compras
          </PrimaryButton>
        </Actions>
      </Container>
    );
  }

  if (error || !buy) {
    return (
      <Container>
        <ErrorBox role="alert">{error ?? 'No se pudo cargar la compra.'}</ErrorBox>
        <Actions>
          <PrimaryButton type="button" onClick={() => void load()}>
            Reintentar
          </PrimaryButton>
          <SecondaryButton type="button" onClick={() => router.push('/buy')}>
            Volver al listado
          </SecondaryButton>
        </Actions>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <TitleBlock>
          <Title>Detalle de compra</Title>
          <Subtitle>
            {proveedorLabel}
            {buy.docNumber ? ` · Comprobante ${buy.docNumber}` : ''}
          </Subtitle>
        </TitleBlock>

        <Actions>
          {canUpdate && (
            <SecondaryButton type="button" onClick={() => router.push(`/buy/editBuy/${id}`)}>
              Editar
            </SecondaryButton>
          )}
          <PrimaryButton type="button" onClick={() => router.push('/buy')}>
            Volver al listado
          </PrimaryButton>
        </Actions>
      </Header>

      <InfoGrid>
        <InfoCard>
          <InfoLabel>Fecha</InfoLabel>
          <InfoValue>
            {buy.createdAt ? format(new Date(buy.createdAt), 'dd/MM/yyyy') : '—'}
          </InfoValue>
        </InfoCard>

        <InfoCard>
          <InfoLabel>Estado</InfoLabel>
          <InfoValue>{ESTADO_LABELS[buy.estado ?? ''] ?? buy.estado ?? '—'}</InfoValue>
        </InfoCard>

        <InfoCard>
          <InfoLabel>Ítems</InfoLabel>
          <InfoValue>{items.length}</InfoValue>
        </InfoCard>

        <InfoCard>
          <InfoLabel>Total</InfoLabel>
          <InfoValue>{formatCurrency(headerTotal)}</InfoValue>
        </InfoCard>
      </InfoGrid>

      {totalMismatch && (
        <WarningBox>
          La suma de los ítems ({formatCurrency(itemsTotal)}) no coincide con el total de la compra (
          {formatCurrency(headerTotal)}).
        </WarningBox>
      )}

      <Card>
        <CardTitle>Ítems de la compra</CardTitle>

        {items.length === 0 ? (
          <Notice>Esta compra no tiene ítems registrados.</Notice>
        ) : (
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <Th>Producto</Th>
                  <Th $right>Cantidad</Th>
                  <Th $right>Precio unitario</Th>
                  <Th $right>Subtotal</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item._id ?? `${item.idProducto}-${index}`}>
                    <Td>{item.descripcion ?? 'Producto sin descripción'}</Td>
                    <Td $right>{item.cantidad ?? 0}</Td>
                    <Td $right>{formatCurrency(item.precio ?? 0)}</Td>
                    <Td $right>{formatCurrency(item.total ?? 0)}</Td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <Th colSpan={3} $right>
                    Total de ítems
                  </Th>
                  <Th $right>{formatCurrency(itemsTotal)}</Th>
                </tr>
              </tfoot>
            </Table>
          </TableWrapper>
        )}
      </Card>
    </Container>
  );
}

export default function BuyDetailPage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute
      requiredPermission={Permission.READ_BUY}
      deniedMessage="No tenés permiso para ver las compras"
    >
      <BuyDetailScreen id={params.id} />
    </ProtectedRoute>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  box-sizing: border-box;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
`;

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Title = styled.h1`
  font-size: 26px;
  font-weight: 700;
  color: #333;
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: #777;
  margin: 0;
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
`;

const InfoCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 16px 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const InfoLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
`;

const InfoValue = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: #3764a0;
`;

const Card = styled.section`
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const CardTitle = styled.h2`
  font-size: 16px;
  font-weight: 700;
  color: #333;
  margin: 0;
`;

const TableWrapper = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
`;

const Th = styled.th<{ $right?: boolean }>`
  background: #f5f5f5;
  padding: 12px;
  text-align: ${props => (props.$right ? 'right' : 'left')};
  font-weight: 600;
  color: #666;
  border-bottom: 2px solid #ddd;
  white-space: nowrap;
`;

const Td = styled.td<{ $right?: boolean }>`
  padding: 12px;
  border-bottom: 1px solid #eee;
  text-align: ${props => (props.$right ? 'right' : 'left')};
  color: #333;
`;

const Notice = styled.p`
  font-size: 14px;
  color: #777;
  background: #f7f9fc;
  border: 1px dashed #cdd7e3;
  border-radius: 10px;
  padding: 20px;
  margin: 0;
  text-align: center;
`;

const ErrorBox = styled.div`
  background: #fdecea;
  border: 1px solid #f5c2c0;
  border-radius: 10px;
  padding: 14px 18px;
  font-size: 14px;
  color: #b71c1c;
`;

const WarningBox = styled.div`
  background: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 13px;
  color: #8a6d3b;
`;

const PrimaryButton = styled.button`
  padding: 9px 18px;
  border: none;
  border-radius: 8px;
  background: #3764a0;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
`;

const SecondaryButton = styled.button`
  padding: 9px 18px;
  border: 1px solid #3764a0;
  border-radius: 8px;
  background: white;
  color: #3764a0;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
`;
