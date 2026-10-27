'use client';

import React from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { getItemLinks } from '@/redux/purchaseDocSlice';
import { LinkingStatus } from '@/interfaces/purchaseDoc.interface';
import { MdCheckCircle, MdRadioButtonUnchecked } from 'react-icons/md';

export default function ProgressIndicator() {
  const itemLinks = useSelector(getItemLinks);
  
  const itemsArray = Object.values(itemLinks);
  const totalItems = itemsArray.length;
  const resolvedItems = itemsArray.filter(
    link => link.status === LinkingStatus.LINKED || link.status === LinkingStatus.NEW_PRODUCT
  ).length;
  
  const percentage = totalItems > 0 ? (resolvedItems / totalItems) * 100 : 0;
  const isComplete = resolvedItems === totalItems && totalItems > 0;
  
  return (
    <Card>
      <Header>
        <Title>
          {isComplete ? <MdCheckCircle size={24} color="#4CAF50" /> : <MdRadioButtonUnchecked size={24} color="#999" />}
          Progreso de Vinculación
        </Title>
        <Stats>
          <Stat complete={isComplete}>
            {resolvedItems} / {totalItems} {totalItems === 1 ? 'ítem vinculado' : 'ítems vinculados'}
          </Stat>
        </Stats>
      </Header>
      
      <ProgressBar>
        <ProgressFill width={percentage} complete={isComplete} />
      </ProgressBar>
      
      {!isComplete && totalItems > 0 && (
        <Hint>Vincula todos los ítems para poder confirmar la compra</Hint>
      )}
      
      {isComplete && (
        <SuccessMessage>¡Todos los ítems están vinculados!</SuccessMessage>
      )}
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
`;

const Title = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Stats = styled.div`
  display: flex;
  gap: 16px;
`;

const Stat = styled.span<{ complete?: boolean }>`
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.complete ? '#4CAF50' : '#666'};
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 12px;
  background: #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ width: number; complete: boolean }>`
  height: 100%;
  width: ${props => props.width}%;
  background: ${props => props.complete ? '#4CAF50' : '#FA9B50'};
  transition: width 0.3s ease, background 0.3s ease;
`;

const Hint = styled.p`
  font-size: 14px;
  color: #666;
  margin: 12px 0 0;
`;

const SuccessMessage = styled.p`
  font-size: 14px;
  color: #4CAF50;
  font-weight: 600;
  margin: 12px 0 0;
`;
