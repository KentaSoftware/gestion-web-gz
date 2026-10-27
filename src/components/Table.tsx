import { useDate } from '@/hooks/useDate'
import React from 'react'
import styled, { CSSProperties } from 'styled-components'
import { formatCurrency } from '@/utils/validators'

interface Column {
  label: string
  field: string
  width: string
  align?: CSSProperties['textAlign']
  price?: boolean
  date?: boolean
}

export default function Table({data = [], columns, onClick, date=false, maxHeight = true, title, print = false}: 
  {data: any[], columns: Column[], onClick: (item:any)=>void, date?: boolean, maxHeight: boolean, title?: string, print?: boolean}) {
  return (
    <div>
      {title && <Tag $print={print}>{title}</Tag>}
      <List maxHeight={maxHeight || true}>
          <TableHeader color={process.env.TEXT_COLOR} $print={print} >
              {columns.map((column: Column, index: number) => (
                <div key={index} style={{ flexBasis: column.width, textAlign: column.align, maxWidth: column.width }}>
                  {column.label}
                </div>
              ))}
          </TableHeader>
          {
              data.length === 0 ?
                  <TableRow $print={print}>
                      <div style={{textAlign: 'center'}} data-label="Sucursal">NO HAY ELEMENTOS</div>
                  </TableRow>
              :
              data.map((item:any,index:number)=>{

                return(
                  <TableRow key={index} onClick={()=>onClick(item)} color={process.env.TEXT_COLOR} $print={print} >
                      {columns.map((column: Column, columnIndex: number) =>{ 
                        // eslint-disable-next-line
                        const fecha = useDate(item[column.field]).date;
                        return(
                          <div
                            key={columnIndex}
                            style={{ flexBasis: column.width, textAlign: column.align, maxWidth: column.width, wordWrap: 'break-word', whiteSpace: 'normal' }}
                            data-label={column.label}
                          >
                            {column.date ? 
                              fecha
                              :
                              (column.price ? 
                                formatCurrency(Number(item[column.field]) || 0)
                                : 
                                item[column.field]?.toString())
                            }
                          </div>
                        )
                      })}
                  </TableRow>
                )
              })
          }
      </List>
    </div>
  )
}

const TableHeader = styled.li<{$print: boolean}> `
    border-radius: 3px;
    padding: 15px 30px;
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
    color: ${props=>props.color};
    background-color: #F9F5F6;
    /* font-size: 18px; */
    font-size: ${({ $print }) => ($print ? '20px' : '18px')};
    font-weight: ${({ $print }) => ($print ? '400' : '600')};
    text-transform: uppercase;
    letter-spacing: 0.03em;
`

const TableRow = styled.li<{$print: boolean}> `
    border-radius: 3px;
    padding: 0px 30px;
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
    font-weight: ${({ $print }) => ($print ? '400' : '600')};
    text-transform: ${({ $print }) => ($print ? 'uppercase' : 'none')};;
    color: ${props=>props.color};
    font-size: ${({ $print }) => ($print ? '20px' : '18px')};
    background-color: #ffffff;
    cursor: ${props=>props.onClick && 'pointer'};
    :hover{
        background-color: ${props=>props.onClick && '#F9F5F6'};
    };
`

interface List {
  maxHeight?: boolean
}

const List = styled.ul<List> `
  max-height: ${props => !props.maxHeight ? 'none' : '800px' };
  padding: 0;
  overflow-y: scroll;
`

const Tag = styled.h5<{$print: boolean}> `
    /* font-size: 18px; */
    font-size: ${({ $print }) => ($print ? '20px' : '18px')};
    padding: 0 15px;
    font-weight: ${({ $print }) => ($print ? '400' : '600')};;
    margin: 5px 0;
    color: ${process.env.TEXT_COLOR};
    text-transform: ${({ $print }) => ($print ? 'uppercase' : 'none')};;
`