/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, type CSSProperties } from 'react'
import Table from '../Table';
import apiClient from '@/utils/client';
import useLocalStorage from '@/hooks/useLocalStorage';
import Button from '../Button';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Logo from '../Logo';
import { useAppDispatch } from '@/redux/hook';
import { setLoading } from '@/redux/loadingSlice';
import { Types } from 'mongoose';
import { Sale } from '@/interfaces/sale.interface';
import { ItemSale } from '../../interfaces/sale.interface';

interface ResponseSale {
  r: Sale
  itemsSale: ItemSale[]
}

interface Column {
  label: string
  field: string
  width: string
  align?: CSSProperties['textAlign']
  price?: boolean
  date?: boolean
}

export default function PrintSale({id}:{id: string | Types.ObjectId | undefined}) {

  const [sale, setSale] = useState<ResponseSale | undefined>(undefined)
  const [valueStorage , setValue] = useLocalStorage("user", "")
  const dispatch = useAppDispatch();

  const getSale = () => {
    dispatch(setLoading(true))
    apiClient.get(`/sale/${id}`,{
      headers: {
          Authorization: `Bearer ${valueStorage.token}`
      },
  })
    .then(({data}:{data: ResponseSale})=>{setSale(data);dispatch(setLoading(false));})
    .catch((e)=>{console.log(e);dispatch(setLoading(false))})
  }

  const generatePdf = async () => {
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    for (let index = 0; index < [...Array(totalPartes)].length; index++) {
      const element = document.getElementById(`print-${index}`);

      if (!element) {
        continue
      }

      await html2canvas(element, { scale: 2, useCORS: true }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pdfWidth;
        const imgHeight = pdfHeight;
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        /* 100 y 200 */
      });
      if (index < [...Array(totalPartes)].length-1) {
        pdf.addPage()
      }
    }
    if (!sale) {
      return
    }
    const pdfName = `venta-${sale.r.cliente}-${sale.r.createdAt.split("T")[0]}.pdf`;
    pdf.save(pdfName);
  };

  useEffect(()=> {
    getSale()
  },[id])

  // Definir el número máximo de elementos por parte
  const elementosPorParte = 28;

  // Calcular el número total de partes necesarias
  let totalPartes = 0

  if (sale) {
      if (sale?.itemsSale.length !== 0) {
        totalPartes = Math.ceil(sale.itemsSale.length / elementosPorParte);
      }
  }

  if (!sale) {
    return null
  }

  return (
    <div className="overflow-y-scroll">
      <div className="flex justify-end">
        <Button text={'Imprimir'} onClick={generatePdf} />
      </div>
      {[...Array(totalPartes)].map((_, index) => {
        // Calcular el índice de inicio y fin para cada parte
        const startIndex = index * elementosPorParte;
        const endIndex = (index + 1) * elementosPorParte;

        // Obtener los elementos de la parte actual
        const parteActual = sale.itemsSale.slice(startIndex, endIndex);

        return (
          <div key={index} id={`print-${index}`} className="mx-auto flex h-[297mm] w-[210mm] flex-1 flex-col whitespace-nowrap p-[10mm] font-body text-body text-text-primary text-ellipsis">
            <Logo/>
            <h2 className="text-lg font-semibold text-text-primary">Presupuesto</h2>
            <div>
                <h5 className="my-2.5 px-[15px] text-lg font-semibold text-text-primary">CLIENTE : {sale.r.cliente}</h5>
                <h5 className="my-2.5 px-[15px] text-lg font-semibold text-text-primary">FECHA : {sale.r.createdAt.split("T")[0]}</h5>
              </div>
              <div>
                <Table
                  data={parteActual}
                  columns={columns}
                  maxHeight={false}
                  onClick={() => ''}
                />
            </div>
            {index === totalPartes - 1 && (
              <h5 className="my-2.5 px-[15px] text-right text-lg font-semibold text-text-primary">TOTAL : $ {sale.r.total}</h5>
            )}
            <p className="text-lg font-semibold text-text-primary">*No valido como factura</p>
            <p className="text-right text-lg font-medium text-text-primary">Pagina {index+1} de {totalPartes}</p>
          </div>
        );
      })}
    </div>
  );
}

const columns: Column[] = [
  { label: 'Producto', field: 'descripcion', width: '40%' },
  { label: 'Cantidad', field: 'cantidad', width: '20%', align: 'center' },
  { label: 'P. unitario', field: 'precioUnitario', width: '20%', align: 'center', price: true },
  { label: 'Total', field: 'total', width: '20%', align: 'center', price: true },
];
