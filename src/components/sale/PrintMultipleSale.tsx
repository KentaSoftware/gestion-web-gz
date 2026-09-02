/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, type CSSProperties } from 'react'
import Table from '../Table';
import apiClient from '@/utils/client';
import useLocalStorage from '@/hooks/useLocalStorage';
import { useAppDispatch } from '@/redux/hook';
import { setLoading } from '@/redux/loadingSlice';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Logo from '../Logo';
import { Sale } from '@/interfaces/sale.interface';
import { ItemSale } from '../../interfaces/sale.interface';
import Button from '../Button';
import Modal from '../Modal';

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

export default function PrintMultipleSale({open, handleClose, salesIds}:{open:boolean, handleClose: ()=>void, salesIds:Sale[]}) {
    const [sales, setSales] = useState<ResponseSale[]>([]);
    const [valueStorage , setValue] = useLocalStorage("user", "")
    const dispatch = useAppDispatch();
  
    const getSales = () => {
      dispatch(setLoading(true));
      const requests = salesIds.map((item: Sale) => 
        apiClient.get(`/sale/${item._id}`, {
          headers: {
            Authorization: `Bearer ${valueStorage.token}`
          },
        })
      );
  
      Promise.all(requests)
        .then((responses) => {
          const data = responses.map(({data}) => data);
          setSales(data);
          dispatch(setLoading(false));
        })
        .catch((e) => {console.log(e); dispatch(setLoading(false))});
    }

    useEffect(()=>console.log("sales",sales),[sales]) 
  
    const generatePdf = async () => {
        dispatch(setLoading(true));
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        const boletasPorFila = 2; // Número de boletas por fila
        const boletasPorColumna = 2; // Número de boletas por columna
        const boletaWidth = pageWidth / boletasPorFila; // Ajustar para que quepan 2 boletas en una fila
        const boletaHeight = pageHeight / boletasPorColumna; // Ajustar para que quepan 3 boletas en una columna
      
        let xOffset = 0;
        let yOffset = 0;
      
        for (let saleIndex = 0; saleIndex < sales.length; saleIndex++) {
          const sale = sales[saleIndex];
      
          for (let index = 0; index < [...Array(totalParts[saleIndex])].length; index++) {
            const element = document.getElementById(`print-${saleIndex}-${index}`);

            if (!element) {
              continue
            }
            
            await html2canvas(element, { scale: 2, useCORS: true }).then((canvas) => {
              const imgData = canvas.toDataURL('image/png');
      
              // Agregar imagen en la posición calculada
              pdf.addImage(imgData, 'PNG', xOffset, yOffset, boletaWidth, boletaHeight);
      
              // Calcular la siguiente posición
              xOffset += boletaWidth;
              if (xOffset + boletaWidth > pageWidth) {
                xOffset = 0;
                yOffset += boletaHeight;
              }
      
              // Si la siguiente boleta no cabe en la misma página, agregar una nueva página
              if (yOffset + boletaHeight > pageHeight) {
                pdf.addPage();
                xOffset = 0;
                yOffset = 0;
              }
            });
          }
        }
      
        const pdfName = `ventas.pdf`;
        pdf.save(pdfName);
        dispatch(setLoading(false));
      };
      
  
    useEffect(() => {
      getSales();
    }, [salesIds]);
  
    // Definir el número máximo de elementos por parte
    const elementsPerPart = 28;
  
    // Calcular el número total de partes necesarias por venta
    const totalParts = sales.map(sale => 
      sale.itemsSale.length !== 0 ? Math.ceil(sale.itemsSale.length / elementsPerPart) : 0
    );
  
    if (!sales.length) {
      return null;
    }
  
    return (
    <Modal open={open} title='Imprimir venta' eClose={handleClose} height='90%' width='60%' >

      <div className="overflow-y-scroll">
        <div className="flex justify-end">
          <Button text={'Imprimir'} onClick={generatePdf} />
        </div>
        {sales.map((sale, saleIndex) => (
          [...Array(totalParts[saleIndex])].map((_, index) => {
            const startIndex = index * elementsPerPart;
            const endIndex = (index + 1) * elementsPerPart;
            const currentPart = sale.itemsSale.slice(startIndex, endIndex);

            return (
              <div key={`${saleIndex}-${index}`} id={`print-${saleIndex}-${index}`} className="mx-auto flex h-[297mm] w-[210mm] flex-1 flex-col whitespace-nowrap p-[10mm] font-body text-body text-text-primary text-ellipsis">
                <Logo />
                <h2 className="text-lg font-semibold text-text-primary">Presupuesto</h2>
                <div>
                  <h5 className="my-2.5 px-[15px] text-subheading font-normal text-text-primary">CLIENTE : {sale.r.cliente}</h5>
                  <h5 className="my-2.5 px-[15px] text-subheading font-normal text-text-primary">FECHA : {sale.r.createdAt.split("T")[0]}</h5>
                </div>
                <div>
                  <Table
                    data={currentPart}
                    columns={columns}
                    maxHeight={false}
                    onClick={() => ''}
                    print={true}
                  />
                </div>
                {index === totalParts[saleIndex] - 1 && (
                  <h5 className="my-2.5 px-[15px] text-right text-[25px] font-semibold text-text-primary">TOTAL : $ {sale.r.total}</h5>
                )}
                <p className="text-lg font-semibold text-text-primary">*No valido como factura</p>
                <p className="text-right text-lg font-medium text-text-primary">
                  Pagina {index + 1} de {totalParts[saleIndex]}
                </p>
              </div>
            );
          })
        ))}
      </div>
    </Modal>
    );
}



const columns: Column[] = [
    { label: 'Producto', field: 'descripcion', width: '40%' },
    { label: 'Cantidad', field: 'cantidad', width: '20%', align: 'center' },
    { label: 'P. unitario', field: 'precioUnitario', width: '20%', align: 'center', price: true },
    { label: 'Total', field: 'total', width: '20%', align: 'center', price: true },
  ];
  
