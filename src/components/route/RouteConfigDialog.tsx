'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { routePlanService } from '@/services/routePlan.service'
import { GeocodingForm } from './GeocodingDialog'
import { coordinatesFromInputs, LocationMapPicker } from './LocationMapPicker'

export interface LocationClient { id: string; name: string; address?: string }
interface RouteConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  canManageConfig?: boolean
  canConfirmLocation?: boolean
  clients?: LocationClient[]
  onLocationSaved?: () => void
}

export function RouteConfigDialog({ open, onOpenChange, canManageConfig = true, canConfirmLocation = false, clients = [], onLocationSaved }: RouteConfigDialogProps) {
  const depotId = useId(); const addressId = useId(); const latId = useId(); const lngId = useId(); const fuelId = useId(); const maxStopsId = useId(); const clientId = useId()
  const [name, setName] = useState(''); const [address, setAddress] = useState(''); const [latitude, setLatitude] = useState(''); const [longitude, setLongitude] = useState('')
  const [fuel, setFuel] = useState(''); const [maxStops, setMaxStops] = useState(''); const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle'); const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [configLoaded, setConfigLoaded] = useState(false)
  const generation = useRef(0)
  const selectedClient = clients.find((client) => client.id === selectedId)

  useEffect(() => {
    const request = ++generation.current
    if (!open || !canManageConfig) return
    setStatus('loading'); setError(''); setConfigLoaded(false)
    void routePlanService.getConfig().then((config) => {
      if (request !== generation.current) return
      setName(config.depot.name); setAddress(config.depot.address ?? ''); setLatitude(String(config.depot.latitude)); setLongitude(String(config.depot.longitude))
      setFuel(config.fuelConsumptionLitersPer100Km === undefined ? '' : String(config.fuelConsumptionLitersPer100Km)); setMaxStops(config.maxStops === undefined ? '' : String(config.maxStops)); setConfigLoaded(true); setStatus('idle')
    }).catch(() => { if (request === generation.current) { setStatus('error'); setError('No se pudo cargar la configuración de rutas.') } })
    return () => { generation.current += 1 }
  }, [open, canManageConfig])

  const save = async () => {
    if (!canManageConfig || !configLoaded) return
    const point = coordinatesFromInputs(latitude, longitude)
    const consumption = fuel.trim() === '' ? undefined : Number(fuel); const stops = maxStops.trim() === '' ? undefined : Number(maxStops)
    if (name.trim() === '' || point === null || (consumption !== undefined && (!Number.isFinite(consumption) || consumption <= 0)) || (stops !== undefined && (!Number.isInteger(stops) || stops < 1 || stops > 50))) { setStatus('error'); setError('Revisá el depósito, las coordenadas, el consumo y el límite de paradas.'); return }
    const request = ++generation.current
    setStatus('loading'); setError('')
    try {
      await routePlanService.updateConfig({ depot: { name: name.trim(), ...(address.trim() !== '' ? { address: address.trim() } : {}), latitude: point.lat, longitude: point.lng }, routeMode: 'google-routes', fuelConsumptionLitersPer100Km: consumption, maxStops: stops })
      if (request === generation.current) setStatus('success')
    } catch { if (request === generation.current) { setStatus('error'); setError('No se pudo guardar la configuración. Intentá nuevamente.') } }
  }

  return <Dialog open={open} onOpenChange={(next) => { if (!next) generation.current += 1; onOpenChange(next) }}>
    <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-6xl overflow-y-auto bg-surface-raised">
      <DialogHeader><DialogTitle>Configurar ubicaciones</DialogTitle><DialogDescription>Actualizá ubicaciones y parámetros operativos. La configuración no modifica snapshots guardados.</DialogDescription></DialogHeader>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="grid content-start gap-3" aria-label="Configurar depósito de origen">
          <h3 className="font-semibold">Configurar depósito de origen</h3>
          {canManageConfig ? <>
            <div><Label htmlFor={depotId}>Nombre del depósito</Label><Input id={depotId} value={name} onChange={(event) => setName(event.target.value)} disabled={status === 'loading'} /></div>
            <div><Label htmlFor={addressId}>Dirección del depósito</Label><Input id={addressId} value={address} onChange={(event) => setAddress(event.target.value)} disabled={status === 'loading'} /></div>
            <LocationMapPicker kind="origin" address={address} value={coordinatesFromInputs(latitude, longitude)} onChange={(point) => { setLatitude(String(point.lat)); setLongitude(String(point.lng)) }} />
            <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor={latId}>Latitud del depósito</Label><Input id={latId} inputMode="decimal" value={latitude} onChange={(event) => setLatitude(event.target.value)} /></div><div><Label htmlFor={lngId}>Longitud del depósito</Label><Input id={lngId} inputMode="decimal" value={longitude} onChange={(event) => setLongitude(event.target.value)} /></div></div>
            <details><summary className="cursor-pointer text-sm font-medium">Configuración avanzada</summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><div><Label htmlFor={fuelId}>Consumo (L/100 km)</Label><Input id={fuelId} inputMode="decimal" value={fuel} onChange={(event) => setFuel(event.target.value)} /></div><div><Label htmlFor={maxStopsId}>Máximo de paradas</Label><Input id={maxStopsId} inputMode="numeric" value={maxStops} onChange={(event) => setMaxStops(event.target.value)} /></div></div></details>
            {status === 'error' && <p role="alert" className="text-sm text-state-error">{error}</p>}{status === 'success' && <p role="status" className="text-sm text-state-success">Configuración guardada correctamente.</p>}
            <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="button" onClick={() => void save()} disabled={status === 'loading' || !configLoaded}>{status === 'loading' ? 'Guardando…' : 'Guardar configuración'}</Button></div>
          </> : <p className="text-sm text-text-secondary">No tenés permiso para configurar el depósito.</p>}
        </section>
        <section className="grid content-start gap-3" aria-label="Geocodificación manual de direcciones">
          <h3 className="font-semibold">Geocodificación manual de direcciones</h3>
          {canConfirmLocation ? <>
            <div><Label htmlFor={clientId}>Cliente</Label><select id={clientId} value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="h-10 w-full rounded-md border border-border-subtle bg-surface-base px-3 text-sm text-text-primary"><option value="">Seleccioná un cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></div>
            {selectedClient ? <GeocodingForm open clientId={selectedClient.id} address={selectedClient.address} onOpenChange={onOpenChange} onConfirmed={onLocationSaved} onSaved={onLocationSaved} /> : <p className="text-sm text-text-secondary">Seleccioná un cliente con pedido para cargar su ubicación.</p>}
          </> : <p className="text-sm text-text-secondary">No tenés permiso para confirmar ubicaciones de clientes.</p>}
        </section>
      </div>
    </DialogContent>
  </Dialog>
}
