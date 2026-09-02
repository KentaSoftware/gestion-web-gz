import React, { useEffect, useState } from "react";
import Modal from '../Modal'
import { format } from 'date-fns';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import Button from "../Button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function ModalAutoGenerate({open, handleClose, handleSubmit}:{open:boolean, handleClose: ()=>void, handleSubmit: (startDate: Date, endDate: Date, isSelectRange: boolean)=>void}) {

  
  const [startDate, setStartDate] = React.useState<Date>(new Date());
  const [endDate, setEndDate] = React.useState<Date>(new Date());
  const [startOpen, setStartOpen] = React.useState(false);
  const [endOpen, setEndOpen] = React.useState(false);
  const [isSelectRange, setIsSelectRange] = useState(true)

  return (
    <Modal open={open} title='Elegir fecha' eClose={handleClose} height='auto' width='auto' outside={false} >
        <div className="p-[15px] pt-0">
          <div className="flex items-center gap-2">
            <Checkbox id="avg-checkbox" checked={!isSelectRange} onCheckedChange={()=>setIsSelectRange(!isSelectRange)} />
            <Label htmlFor="avg-checkbox" className="text-sm cursor-pointer">Promedio de 4 semanas anteriores</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="range-checkbox" checked={isSelectRange} onCheckedChange={()=>setIsSelectRange(!isSelectRange)} />
            <Label htmlFor="range-checkbox" className="text-sm cursor-pointer">Selecciona un rango de fechas</Label>
          </div>
          <div className="flex justify-around items-center mb-[25px]" >
            <Popover open={startOpen} onOpenChange={setStartOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-border-subtle bg-surface-base px-4 text-label text-text-primary hover:bg-background-subtle transition-colors"
                >
                  {format(startDate, 'dd/MM/yyyy')}
                </button>
              </PopoverTrigger>
              <PopoverContent>
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(newValue) => {
                    if (newValue) setStartDate(newValue);
                    setStartOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
            <label className="text-lg font-medium mx-[15px]" >a</label>
            <Popover open={endOpen} onOpenChange={setEndOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-border-subtle bg-surface-base px-4 text-label text-text-primary hover:bg-background-subtle transition-colors"
                >
                  {format(endDate, 'dd/MM/yyyy')}
                </button>
              </PopoverTrigger>
              <PopoverContent>
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(newValue) => {
                    if (newValue) setEndDate(newValue);
                    setEndOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex justify-around items-center">
             <Button text="Cancelar" variant="secondary" className="mx-1 my-1 px-3.5 shadow-sm hover:bg-brand-primary hover:text-text-inverse hover:border-brand-primary active:translate-y-px" onClick={handleClose} />
             <Button text="Aplicar" variant="secondary" className="mx-1 my-1 px-3.5 shadow-sm hover:bg-brand-primary hover:text-text-inverse hover:border-brand-primary active:translate-y-px" onClick={()=>handleSubmit(startDate, endDate, isSelectRange)} />
          </div>
        </div>
    </Modal>
  )
}
