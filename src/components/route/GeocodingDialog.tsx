'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { clientService } from '@/services/client.service'
import type { ClientLocationSnapshot, GeocodingCandidate } from '@/interfaces/client.interface'
import { coordinatesFromInputs, LocationMapPicker } from './LocationMapPicker'

interface GeocodingDialogProps {
  open: boolean
  clientId: string | null
  clientName?: string
  address?: string
  onOpenChange: (open: boolean) => void
  onConfirmed?: () => void
  onSaved?: () => void
}

export function GeocodingDialog(props: GeocodingDialogProps) {
  return <Dialog open={props.open} onOpenChange={props.onOpenChange}>
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Confirmar ubicación{props.clientName ? `: ${props.clientName}` : ''}</DialogTitle><DialogDescription>Buscá candidatos para confirmar o guardá una referencia manual pendiente de validación.</DialogDescription></DialogHeader>
      {props.open && <GeocodingForm {...props} />}
      <DialogFooter><Button type="button" variant="secondary" onClick={() => props.onOpenChange(false)}>Cerrar</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}

export function GeocodingForm({ open, clientId, address, onConfirmed, onSaved }: GeocodingDialogProps) {
  const addressId = useId()
  const latId = useId()
  const lngId = useId()
  const generation = useRef(0)
  const snapshotGeneration = useRef(0)
  const coordinatesEdited = useRef(false)
  const [query, setQuery] = useState(address ?? '')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [candidates, setCandidates] = useState<GeocodingCandidate[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'confirmed' | 'pending' | 'unknown'>('idle')
  const [error, setError] = useState('')
  const [snapshot, setSnapshot] = useState<ClientLocationSnapshot | null>(null)
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [snapshotVersion, setSnapshotVersion] = useState(0)

  useEffect(() => {
    generation.current += 1
    coordinatesEdited.current = false
    if (open) {
      setQuery(address ?? '')
      setLatitude('')
      setLongitude('')
      setCandidates([])
      setStatus('idle')
      setError('')
    }
    return () => { generation.current += 1 }
  }, [open, clientId, address])

  useEffect(() => {
    const requestGeneration = ++snapshotGeneration.current
    setSnapshot(null)
    if (!open || clientId === null) return
    setSnapshotLoading(true)
    void Promise.resolve().then(() => clientService.locationSnapshot(clientId)).then((value) => {
      if (snapshotGeneration.current !== requestGeneration) return
      setSnapshot(value)
      if (!coordinatesEdited.current) {
        setLatitude(value.lat == null ? '' : String(value.lat))
        setLongitude(value.lng == null ? '' : String(value.lng))
      }
      setConflict(false)
    }).catch(() => {
      if (snapshotGeneration.current === requestGeneration) { setError('No se pudo cargar la ubicación actual. Recargá antes de confirmar coordenadas.'); setStatus('error') }
    }).finally(() => { if (snapshotGeneration.current === requestGeneration) setSnapshotLoading(false) })
    return () => { snapshotGeneration.current += 1 }
  }, [open, clientId, snapshotVersion])

  const handleConfirmationError = (caught: unknown, fallback: string) => {
    const stale = typeof caught === 'object' && caught !== null && 'response' in caught && typeof caught.response === 'object' && caught.response !== null && 'status' in caught.response && caught.response.status === 409
    if (stale) { setConflict(true); setSnapshot(null) }
    setStatus('error')
    setError(stale ? 'La ubicación cambió. Recargá y revisá las coordenadas antes de confirmar nuevamente.' : fallback)
  }

  const search = async () => {
    if (clientId === null || query.trim() === '') {
      setError('Ingresá una dirección para buscar.')
      setStatus('error')
      return
    }
    const request = ++generation.current
    setStatus('loading')
    setError('')
    setCandidates([])
    try {
      const result = await clientService.geocode(clientId, query.trim())
      if (request !== generation.current) return
      setCandidates(result.candidates)
      setStatus('idle')
    } catch {
      if (request !== generation.current) return
      setStatus('error')
      setError('El proveedor de geocodificación no está disponible. Podés ingresar las coordenadas manualmente.')
    }
  }

  const confirm = async (candidate: GeocodingCandidate) => {
    if (clientId === null || snapshot === null || snapshotLoading || conflict) return
    const request = ++generation.current
    setStatus('loading')
    setError('')
    try {
      await clientService.confirmLocation(clientId, { candidate, expectedLocation: snapshot })
      if (request !== generation.current) return
      setSnapshot(null)
      setStatus('confirmed')
      onConfirmed?.()
    } catch (caught: unknown) {
      if (request !== generation.current) return
      handleConfirmationError(caught, 'No se pudo confirmar la ubicación.')
    }
  }

  const saveManual = async () => {
    if (snapshot === null || snapshotLoading || conflict) return
    const lat = Number(latitude)
    const lng = Number(longitude)
    if (clientId === null || query.trim() === '' || latitude.trim() === '' || longitude.trim() === '' ||
      !Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180) {
      setStatus('error')
      setError('Ingresá una dirección y coordenadas válidas: latitud entre -90 y 90 y longitud entre -180 y 180.')
      return
    }
    const request = ++generation.current
    setStatus('loading')
    setError('')
    try {
      const result = await clientService.confirmLocation(clientId, { manualReference: { address: query.trim(), lat, lng }, expectedLocation: snapshot })
      if (request !== generation.current) return
      setSnapshot(null)
      setStatus(result.geocoding?.status === 'PENDING' ? 'pending' : 'unknown')
      onSaved?.()
    } catch (caught: unknown) {
      if (request !== generation.current) return
      handleConfirmationError(caught, 'No se pudieron guardar las coordenadas. Intentá nuevamente.')
    }
  }

  const confirmManual = async () => {
    const point = coordinatesFromInputs(latitude, longitude)
    if (clientId === null || snapshot === null || conflict || point === null) {
      setStatus('error'); setError('Ingresá coordenadas válidas y revisá la ubicación actual antes de confirmar.')
      return
    }
    const request = ++generation.current
    setStatus('loading'); setError('')
    try {
      await clientService.confirmLocation(clientId, { manualConfirmation: point, expectedLocation: snapshot })
      if (request !== generation.current) return
      setSnapshot(null)
      setStatus('confirmed')
      onConfirmed?.()
    } catch (caught: unknown) {
      if (request !== generation.current) return
      handleConfirmationError(caught, 'No se pudieron confirmar las coordenadas. Intentá nuevamente.')
    }
  }

  return (
        <div className="grid gap-4">
          <div>
            <Label htmlFor={addressId}>Dirección</Label>
            <div className="flex gap-2">
              <Input id={addressId} value={query} onChange={(event) => { setQuery(event.target.value); setCandidates([]) }} disabled={status === 'loading'} />
              <Button type="button" onClick={() => void search()} disabled={status === 'loading'}>Buscar</Button>
            </div>
          </div>
          {status === 'error' && <p role="alert" className="text-sm text-state-error">{error}</p>}
          {status === 'confirmed' && <p role="status" className="text-sm text-state-success">Ubicación confirmada. Actualizá el dashboard para habilitar la ruta.</p>}
          {status === 'pending' && <p role="status" className="text-sm text-state-success">Ubicación manual guardada. Pendiente de validación.</p>}
          {status === 'unknown' && <p role="status" className="text-sm text-state-warning">Se guardó la referencia, pero no se recibió su estado de validación. Actualizá los datos para verificarlo.</p>}
          {candidates.length === 0 && status === 'idle' && <p role="status" className="text-sm text-text-secondary">No hay candidatos todavía. Si la búsqueda no devuelve resultados, el destino seguirá bloqueado hasta contar con una ubicación válida.</p>}
          {candidates.length > 0 && <ul aria-label="Candidatos de geocodificación" className="grid gap-2">{candidates.map((candidate) => <li key={candidate.placeId} className="rounded-md border border-border-subtle p-3"><p className="text-sm text-text-primary">{candidate.formattedAddress}</p><p className="text-xs text-text-secondary">Precisión: {candidate.precision}</p><Button type="button" size="sm" className="mt-2" onClick={() => void confirm(candidate)} disabled={status === 'loading' || snapshotLoading || snapshot === null || conflict}>Confirmar esta ubicación</Button></li>)}</ul>}
          <fieldset className="grid gap-3 rounded-md border border-border-subtle p-3">
            <legend className="px-1 text-sm font-medium">Referencia manual</legend>
            <p className="text-sm text-text-secondary">Guardá una referencia pendiente o confirmá coordenadas que ya verificaste.</p>
            {snapshot && <p className="text-sm text-text-secondary">Ubicación actual: {snapshot.address || 'Sin dirección'} · {snapshot.lat ?? '—'}, {snapshot.lng ?? '—'}</p>}
            <LocationMapPicker kind="client" value={coordinatesFromInputs(latitude, longitude)} onChange={(point) => { coordinatesEdited.current = true; setLatitude(String(point.lat)); setLongitude(String(point.lng)) }} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label htmlFor={latId}>Latitud</Label><Input id={latId} inputMode="decimal" value={latitude} onChange={(event) => { coordinatesEdited.current = true; setLatitude(event.target.value) }} disabled={status === 'loading'} /></div>
              <div><Label htmlFor={lngId}>Longitud</Label><Input id={lngId} inputMode="decimal" value={longitude} onChange={(event) => { coordinatesEdited.current = true; setLongitude(event.target.value) }} disabled={status === 'loading'} /></div>
            </div>
            <Button type="button" onClick={() => void saveManual()} disabled={status === 'loading' || snapshotLoading || snapshot === null || conflict}>Guardar coordenadas</Button>
            <Button type="button" onClick={() => void confirmManual()} disabled={status === 'loading' || snapshotLoading || snapshot === null || conflict}>Confirmar coordenadas</Button>
            {(conflict || (snapshot === null && !snapshotLoading)) && <Button type="button" variant="secondary" onClick={() => { coordinatesEdited.current = false; setStatus('idle'); setError(''); setSnapshotVersion((version) => version + 1) }}>Recargar ubicación</Button>}
          </fieldset>
        </div>
  )
}
