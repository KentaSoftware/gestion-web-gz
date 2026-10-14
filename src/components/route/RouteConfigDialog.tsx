'use client'

import { useEffect, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { routePlanService } from '@/services/routePlan.service'

interface RouteConfigDialogProps { open: boolean; onOpenChange: (open: boolean) => void }

export function RouteConfigDialog({ open, onOpenChange }: RouteConfigDialogProps) {
  const depotId = useId(); const latId = useId(); const lngId = useId(); const fuelId = useId(); const maxStopsId = useId()
  const [name, setName] = useState(''); const [address, setAddress] = useState(''); const [latitude, setLatitude] = useState(''); const [longitude, setLongitude] = useState('')
  const [fuel, setFuel] = useState(''); const [maxStops, setMaxStops] = useState(''); const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle'); const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setStatus('loading'); setError('')
    void routePlanService.getConfig().then((config) => { setName(config.depot.name); setAddress(config.depot.address ?? ''); setLatitude(String(config.depot.latitude)); setLongitude(String(config.depot.longitude)); setFuel(config.fuelConsumptionLitersPer100Km === undefined ? '' : String(config.fuelConsumptionLitersPer100Km)); setMaxStops(config.maxStops === undefined ? '' : String(config.maxStops)); setStatus('idle') }).catch(() => { setStatus('error'); setError('No se pudo cargar la configuración de rutas.') })
  }, [open])

  const save = async () => {
    const lat = Number(latitude); const lng = Number(longitude); const consumption = fuel === '' ? undefined : Number(fuel); const stops = maxStops === '' ? undefined : Number(maxStops)
    if (name.trim() === '' || !Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180 || (consumption !== undefined && (!Number.isFinite(consumption) || consumption <= 0)) || (stops !== undefined && (!Number.isInteger(stops) || stops < 1 || stops > 50))) { setStatus('error'); setError('Revisá el depósito, el consumo en litros y el límite de paradas.'); return }
    setStatus('loading'); setError('')
    try { await routePlanService.updateConfig({ depot: { name: name.trim(), ...(address.trim() !== '' ? { address: address.trim() } : {}), latitude: lat, longitude: lng }, routeMode: 'google-routes', fuelConsumptionLitersPer100Km: consumption, maxStops: stops }); setStatus('success') } catch { setStatus('error'); setError('No se pudo guardar la configuración. Intentá nuevamente.') }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Configurar ubicaciones</DialogTitle><DialogDescription>Actualizá el depósito y los parámetros operativos. La configuración no modifica snapshots guardados.</DialogDescription></DialogHeader><div className="grid gap-4"><div><Label htmlFor={depotId}>Nombre del depósito</Label><Input id={depotId} value={name} onChange={(e) => setName(e.target.value)} disabled={status === 'loading'} /></div><div><Label htmlFor="route-depot-address">Dirección del depósito</Label><Input id="route-depot-address" value={address} onChange={(e) => setAddress(e.target.value)} disabled={status === 'loading'} /></div><div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor={latId}>Latitud</Label><Input id={latId} inputMode="decimal" value={latitude} onChange={(e) => setLatitude(e.target.value)} /></div><div><Label htmlFor={lngId}>Longitud</Label><Input id={lngId} inputMode="decimal" value={longitude} onChange={(e) => setLongitude(e.target.value)} /></div></div><div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor={fuelId}>Consumo (L/100 km)</Label><Input id={fuelId} inputMode="decimal" value={fuel} onChange={(e) => setFuel(e.target.value)} /></div><div><Label htmlFor={maxStopsId}>Máximo de paradas</Label><Input id={maxStopsId} inputMode="numeric" value={maxStops} onChange={(e) => setMaxStops(e.target.value)} /></div></div>{status === 'error' && <p role="alert" className="text-sm text-state-error">{error}</p>}{status === 'success' && <p role="status" className="text-sm text-state-success">Configuración guardada correctamente.</p>}<DialogFooter><Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="button" onClick={() => void save()} disabled={status === 'loading'}>{status === 'loading' ? 'Guardando…' : 'Guardar configuración'}</Button></DialogFooter></div></DialogContent></Dialog>
}
