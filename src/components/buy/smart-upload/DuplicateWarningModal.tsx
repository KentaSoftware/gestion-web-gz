'use client';

import React from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useAppDispatch } from '@/redux/hook';
import { getPurchaseDocState, setDuplicateModalOpen, setDuplicateDecision } from '@/redux/purchaseDocSlice';
import { setAlert } from '@/redux/alertSlice';
import { DuplicateDecision } from '@/interfaces/purchaseDoc.interface';
import { MdWarning, MdClose } from 'react-icons/md';
import { formatCurrency } from '@/utils/validators';
import { formatCalendarDate } from '@/utils/dates';
import { candidateRef, normalizePercent } from '@/utils/duplicateDisplay';

export default function DuplicateWarningModal() {
  const dispatch = useAppDispatch();
  const { duplicateCheck, duplicateModalOpen } = useSelector(getPurchaseDocState);
  
  if (!duplicateCheck || !duplicateCheck.isDuplicate) return null;
  
  const handleClose = () => {
    dispatch(setDuplicateModalOpen(false));
  };
  
  const handleCancel = () => {
    dispatch(setDuplicateDecision(DuplicateDecision.CANCEL));
    dispatch(setDuplicateModalOpen(false));
    dispatch(setAlert({
      message: 'Registro cancelado: no se creó la compra porque el comprobante ya estaba registrado.',
      type: 'warning',
    }));
  };
  
  const handleProceed = () => {
    dispatch(setDuplicateDecision(DuplicateDecision.PROCEED));
    dispatch(setDuplicateModalOpen(false));
  };
  const handleNotDuplicate = () => {
    dispatch(setDuplicateDecision(DuplicateDecision.NOT_DUPLICATE));
    dispatch(setDuplicateModalOpen(false));
    dispatch(setAlert({
      message: 'Se registra como compra distinta: la advertencia de duplicado quedó descartada.',
      type: 'success',
    }));
  };  
  return (
    <StyledDialog open={duplicateModalOpen} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <TitleBar>
          <WarningIcon>
            <MdWarning size={28} color="#ff9800" />
          </WarningIcon>
          <Title>Posible Comprobante Duplicado</Title>
          <CloseButton onClick={handleClose}>
            <MdClose size={24} />
          </CloseButton>
        </TitleBar>
      </DialogTitle>
      
      <DialogContent>
        <Message>
          Se encontraron comprobantes similares en el sistema. Revisa si el comprobante ya fue registrado:
        </Message>
        
        <CandidatesContainer>
          {duplicateCheck.candidates.map((candidate, index) => (
            <CandidateCard key={index}>
              <CandidateHeader>
                <CandidateTitle>Compra #{candidateRef(candidate)}</CandidateTitle>
                <ScoreBadge score={normalizePercent(candidate.score)}>
                  {normalizePercent(candidate.score)}% similitud
                </ScoreBadge>
              </CandidateHeader>
              
              <CandidateDetails>
                <Detail>
                  <Label>Fecha:</Label>
                  <Value>
                    {formatCalendarDate(candidate.date ?? candidate.documentDate)}
                  </Value>
                </Detail>
                
                <Detail>
                  <Label>Comprobante:</Label>
                  <Value>{candidate.documentNumber || 'N/A'}</Value>
                </Detail>
                
                <Detail>
                  <Label>Total:</Label>
                  <Value>{formatCurrency(candidate.total)}</Value>
                </Detail>
              </CandidateDetails>
              
              {candidate.matchReasons && candidate.matchReasons.length > 0 && (
                <Reasons>
                  <ReasonsTitle>Coincidencias:</ReasonsTitle>
                  <ReasonsList>
                    {candidate.matchReasons.map((reason, idx) => (
                      <Reason key={idx}>{reason}</Reason>
                    ))}
                  </ReasonsList>
                </Reasons>
              )}
            </CandidateCard>
          ))}
        </CandidatesContainer>
        
        <Question>
          ¿Estás seguro de que deseas continuar con el registro de este comprobante?
        </Question>

        <Hint>
          Si el análisis leyó mal el comprobante y en realidad es otra compra, elegí{' '}
          <strong>No es duplicado</strong>: se registra como compra distinta y sin marca.
        </Hint>
      </DialogContent>
      
      <DialogActions>
        <CancelButton onClick={handleCancel}>
          <MdClose size={20} />
          Cancelar Registro
        </CancelButton>
        <NotDuplicateButton onClick={handleNotDuplicate}>
          No es duplicado
        </NotDuplicateButton>
        <ProceedButton onClick={handleProceed}>
          Continuar de Todas Formas
        </ProceedButton>
      </DialogActions>
    </StyledDialog>
  );
}

// Styled Components
const StyledDialog = styled(Dialog)`
  .MuiDialog-paper {
    border-radius: 12px;
  }
`;

const TitleBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const WarningIcon = styled.div`
  display: flex;
  align-items: center;
`;

const Title = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0;
  flex: 1;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  padding: 4px;
  display: flex;
  align-items: center;
  
  &:hover {
    color: #333;
  }
`;

const Message = styled.p`
  font-size: 16px;
  color: #666;
  margin: 0 0 24px;
`;

const CandidatesContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
`;

const CandidateCard = styled.div`
  border: 2px solid #ff9800;
  border-radius: 12px;
  padding: 16px;
  background: #fff8e1;
`;

const CandidateHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const CandidateTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
`;

const ScoreBadge = styled.div<{ score: number }>`
  background: ${props => {
    if (props.score >= 90) return '#f44336';
    if (props.score >= 70) return '#ff9800';
    return '#ffa726';
  }};
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
`;

const CandidateDetails = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 12px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Detail = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Label = styled.span`
  font-size: 12px;
  color: #666;
  font-weight: 600;
`;

const Value = styled.span`
  font-size: 14px;
  color: #333;
`;

const Reasons = styled.div`
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #ffe082;
`;

const ReasonsTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #666;
  margin-bottom: 8px;
`;

const ReasonsList = styled.ul`
  margin: 0;
  padding-left: 20px;
`;

const Reason = styled.li`
  font-size: 13px;
  color: #666;
  margin-bottom: 4px;
`;

const Question = styled.p`
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
  text-align: center;
`;

const Hint = styled.p`
  font-size: 12px;
  color: #777;
  margin: 8px 0 0;
  text-align: center;
  line-height: 1.5;
`;

const CancelButton = styled.button`
  background: #f44336;
  border: none;
  color: white;
  border-radius: 8px;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  
  &:hover {
    background: #da190b;
  }
`;

const NotDuplicateButton = styled.button`
  background: white;
  border: 1px solid #3764a0;
  color: #3764a0;
  border-radius: 8px;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: #eef3fb;
  }
`;

const ProceedButton = styled.button`
  background: #4CAF50;
  border: none;
  color: white;
  border-radius: 8px;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  
  &:hover {
    background: #45a049;
  }
`;
