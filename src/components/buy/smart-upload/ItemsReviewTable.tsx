'use client';

import React from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { useAppDispatch } from '@/redux/hook';
import {
  getAnalysis,
  getItemEdits,
  getItemLinks,
  setItemEdit,
} from '@/redux/purchaseDocSlice';
import { LinkingStatus } from '@/interfaces/purchaseDoc.interface';
import ItemLinkingCell from './ItemLinkingCell';
import { formatCurrency } from '@/utils/validators';
import {
  getRawQuantity,
  getRawUnitPrice,
  resolveItemValues,
  validateItemValues,
} from '@/utils/purchaseDocItems';
import { MdCheckCircle, MdAddCircle, MdRadioButtonUnchecked } from 'react-icons/md';

export default function ItemsReviewTable() {
  const dispatch = useAppDispatch();
  const analysis = useSelector(getAnalysis);
  const itemLinks = useSelector(getItemLinks);
  const itemEdits = useSelector(getItemEdits);

  if (!analysis) return null;

  const { items } = analysis;

  const getStatusIcon = (lineId: string) => {
    const link = itemLinks[lineId];
    if (!link) return <MdRadioButtonUnchecked size={20} color="#999" />;

    switch (link.status) {
      case LinkingStatus.LINKED:
        return <MdCheckCircle size={20} color="#4CAF50" />;
      case LinkingStatus.NEW_PRODUCT:
        return <MdAddCircle size={20} color="#2196F3" />;
      default:
        return <MdRadioButtonUnchecked size={20} color="#999" />;
    }
  };

  const total = items.reduce(
    (sum, item) => sum + resolveItemValues(item, itemEdits[item.lineId]).subtotal,
    0
  );

  return (
    <Card>
      <Header>
        <Title>Ítems del Comprobante</Title>
        <Hint>Podés corregir cantidad y precio unitario detectados por el OCR.</Hint>
      </Header>

      <TableContainer>
        <Table>
          <thead>
            <tr>
              <Th style={{ width: '40px' }}>Estado</Th>
              <Th style={{ width: '50px' }}>#</Th>
              <Th>Descripción</Th>
              <Th style={{ width: '110px' }}>Cantidad</Th>
              <Th style={{ width: '140px' }}>Precio Unit.</Th>
              <Th style={{ width: '120px' }}>Subtotal</Th>
              <Th style={{ width: '300px' }}>Vinculación</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const edit = itemEdits[item.lineId];
              const values = resolveItemValues(item, edit);
              const rowError = validateItemValues(item, edit);
              const description = edit?.description ?? item.description ?? item.rawDescription;

              return (
                <Tr key={item.lineId}>
                  <Td center>{getStatusIcon(item.lineId)}</Td>
                  <Td center>{index + 1}</Td>
                  <Td>
                    <TextInput
                      value={description}
                      aria-label={`Descripción del ítem ${index + 1}`}
                      onChange={event =>
                        dispatch(
                          setItemEdit({
                            lineId: item.lineId,
                            edit: { description: event.target.value },
                          })
                        )
                      }
                    />
                    {item.descriptionConfidence !== undefined && item.descriptionConfidence < 0.7 && (
                      <LowConfidence>
                        Baja confianza ({(item.descriptionConfidence * 100).toFixed(0)}%)
                      </LowConfidence>
                    )}
                  </Td>
                  <Td>
                    <NumberInput
                      inputMode="decimal"
                      value={getRawQuantity(item, edit)}
                      aria-label={`Cantidad del ítem ${index + 1}`}
                      onChange={event =>
                        dispatch(
                          setItemEdit({
                            lineId: item.lineId,
                            edit: { quantity: event.target.value },
                          })
                        )
                      }
                    />
                  </Td>
                  <Td>
                    <NumberInput
                      inputMode="decimal"
                      value={getRawUnitPrice(item, edit)}
                      aria-label={`Precio unitario del ítem ${index + 1}`}
                      onChange={event =>
                        dispatch(
                          setItemEdit({
                            lineId: item.lineId,
                            edit: { unitPrice: event.target.value },
                          })
                        )
                      }
                    />
                  </Td>
                  <Td right bold>{formatCurrency(values.subtotal)}</Td>
                  <Td>
                    <ItemLinkingCell
                      lineId={item.lineId}
                      item={{ ...item, description, rawDescription: description }}
                    />
                    {rowError && <RowError>{rowError}</RowError>}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <Th colSpan={5} style={{ textAlign: 'right' }}>
                Total
              </Th>
              <Th style={{ textAlign: 'right' }}>{formatCurrency(total)}</Th>
              <Th></Th>
            </tr>
          </tfoot>
        </Table>
      </TableContainer>
    </Card>
  );
}

// Styled Components
const Card = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
`;

const Header = styled.div`
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Title = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
`;

const Hint = styled.span`
  font-size: 12px;
  color: #888;
`;

const TableContainer = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
`;

const Th = styled.th`
  background: #f5f5f5;
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #666;
  border-bottom: 2px solid #ddd;
`;

const Tr = styled.tr`
  &:hover {
    background: #fafafa;
  }
`;

const Td = styled.td<{ center?: boolean; right?: boolean; bold?: boolean }>`
  padding: 12px;
  border-bottom: 1px solid #eee;
  text-align: ${props => props.center ? 'center' : props.right ? 'right' : 'left'};
  font-weight: ${props => props.bold ? '600' : 'normal'};
  vertical-align: top;
`;

const TextInput = styled.input`
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  color: #333;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #2196f3;
  }
`;

const NumberInput = styled.input`
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  color: #333;
  text-align: right;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #2196f3;
  }
`;

const LowConfidence = styled.div`
  font-size: 12px;
  color: #ff9800;
  font-style: italic;
  margin-top: 4px;
`;

const RowError = styled.div`
  font-size: 12px;
  color: #c62828;
  margin-top: 6px;
`;
