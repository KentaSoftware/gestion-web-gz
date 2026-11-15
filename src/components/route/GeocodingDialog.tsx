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
  onWritePendingChange?: (pending: boolean) => void
  externalWritePending?: boolean
  isExternalWritePending?: () => boolean
}

export function GeocodingDialog(props: GeocodingDialogProps) {
  const [pending, setPending] = useState(false)
  const pendingCount = useRef(0)
  const setWritePending = (value: boolean) => { pendingCount.current = Math.max(0, pendingCount.current + (value ? 1 : -1)); setPending(pendingCount.current > 0) }
  return <Dialog open={props.open} onOpenChange={(open) => { if (open || pendingCount.current === 0) props.onOpenChange(open) }}>
    <DialogContent className="max-h-[90vh] overflow-y-auto" closeDisabled={pending} onEscapeKeyDown={(event) => { if (pendingCount.current > 0) event.preventDefault() }} onInteractOutside={(event) => { if (pendingCount.current > 0) event.preventDefault() }}>
      <DialogHeader><DialogTitle>Confirmar ubicación{props.clientName ? `: ${props.clientName}` : ''}</DialogTitle><DialogDescription>Buscá candidatos para confirmar o guardá una referencia manual pendiente de validación.</DialogDescription></DialogHeader>
      {props.open && <GeocodingForm {...props} externalWritePending={pending} isExternalWritePending={() => pendingCount.current > 0} onWritePendingChange={setWritePending} />}
      <DialogFooter><Button type="button" variant="secondary" disabled={pending} onClick={() => { if (pendingCount.current === 0) props.onOpenChange(false) }}>Cerrar</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}

export function GeocodingForm({ open, clientId, address, onConfirmed, onSaved, onWritePendingChange, externalWritePending = false, isExternalWritePending }: GeocodingDialogProps) {
  const addressId = useId()
  const latId = useId()
  const lngId = useId()
  const generation = useRef(0)
  const snapshotGeneration = useRef(0)
  const waitingForExternalWrite = useRef(false)
  const coordinatesEdited = useRef(false)
  const addressEdited = useRef(false)
  const writePending = useRef(false)
  const [writing, setWriting] = useState(false)
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
  const blockedByExternalWrite = externalWritePending && !writing
  const busy = status === 'loading' || writing || externalWritePending
  const writeBlocked = () => writePending.current || externalWritePending || isExternalWritePending?.() === true

  const setWritePending = (pending: boolean) => {
    writePending.current = pending
    setWriting(pending)
    onWritePendingChange?.(pending)
  }

  useEffect(() => {
    generation.current += 1
    coordinatesEdited.current = false
    addressEdited.current = false
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
    if (!open || clientId === null) { setSnapshotLoading(false); return }
    if (blockedByExternalWrite) { waitingForExternalWrite.current = true; setSnapshotLoading(false); return }
    setSnapshotLoading(true)
    void Promise.resolve().then(() => clientService.locationSnapshot(clientId)).then((value) => {
      if (snapshotGeneration.current !== requestGeneration) return
      setSnapshot(value)
      if (!addressEdited.current && (waitingForExternalWrite.current || address === undefined || snapshotVersion > 0)) setQuery(value.address ?? '')
      waitingForExternalWrite.current = false
      if (!coordinatesEdited.current) {
        setLatitude(value.lat == null ? '' : String(value.lat))
        setLongitude(value.lng == null ? '' : String(value.lng))
      }
      setConflict(false)
    }).catch(() => {
      if (snapshotGeneration.current === requestGeneration) { setError('No se pudo cargar la ubicación actual. Recargá antes de confirmar coordenadas.'); setStatus('error') }
    }).finally(() => { if (snapshotGeneration.current === requestGeneration) setSnapshotLoading(false) })
    return () => { snapshotGeneration.current += 1 }
  }, [open, clientId, snapshotVersion, blockedByExternalWrite])

  const handleConfirmationError = (caught: unknown, fallback: string) => {
    const stale = typeof caught === 'object' && caught !== null && 'response' in caught && typeof caught.response === 'object' && caught.response !== null && 'status' in caught.response && caught.response.status === 409
    if (stale) { setConflict(true); setSnapshot(null) }
    setStatus('error')
    setError(stale ? 'La ubicación cambió. Recargá y revisá las coordenadas antes de confirmar nuevamente.' : fallback)
  }

  const search = async () => {
    if (writeBlocked()) return
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
    if (clientId === null || snapshot === null || snapshotLoading || conflict || writeBlocked()) return
    setWritePending(true)
    const request = ++generation.current
    setStatus('loading')
    setError('')
    try {
      await clientService.confirmLocation(clientId, { candidate, expectedLocation: snapshot })
      if (request !== generation.current) { onSaved?.(); return }
      setSnapshot(null)
      setStatus('confirmed')
      onConfirmed?.()
    } catch (caught: unknown) {
      if (request !== generation.current) return
      handleConfirmationError(caught, 'No se pudo confirmar la ubicación.')
    } finally { setWritePending(false) }
  }

  const saveManual = async () => {
    if (snapshot === null || snapshotLoading || conflict || writeBlocked()) return
    const lat = Number(latitude)
    const lng = Number(longitude)
    if (clientId === null || query.trim() === '' || latitude.trim() === '' || longitude.trim() === '' ||
      !Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180) {
      setStatus('error')
      setError('Ingresá una dirección y coordenadas válidas: latitud entre -90 y 90 y longitud entre -180 y 180.')
      return
    }
    const request = ++generation.current
    setWritePending(true)
    setStatus('loading')
    setError('')
    try {
      const result = await clientService.confirmLocation(clientId, { manualReference: { address: query.trim(), lat, lng }, expectedLocation: snapshot })
      if (request !== generation.current) { onSaved?.(); return }
      setSnapshot(null)
      setStatus(result.geocoding?.status === 'PENDING' ? 'pending' : 'unknown')
      onSaved?.()
    } catch (caught: unknown) {
      if (request !== generation.current) return
      handleConfirmationError(caught, 'No se pudieron guardar las coordenadas. Intentá nuevamente.')
    } finally { setWritePending(false) }
  }

  const confirmManual = async () => {
    if (writeBlocked()) return
    const point = coordinatesFromInputs(latitude, longitude)
    if (clientId === null || snapshot === null || conflict || point === null) {
      setStatus('error'); setError('Ingresá coordenadas válidas y revisá la ubicación actual antes de confirmar.')
      return
    }
    if (query.trim() !== (snapshot.address ?? '').trim()) {
      setStatus('error'); setError('La dirección editada no está guardada. Guardá la referencia manual antes de confirmar las coordenadas.')
      return
    }
    const request = ++generation.current
    setWritePending(true)
    setStatus('loading'); setError('')
    try {
      await clientService.confirmLocation(clientId, { manualConfirmation: point, expectedLocation: snapshot })
      if (request !== generation.current) { onSaved?.(); return }
      setSnapshot(null)
      setStatus('confirmed')
      onConfirmed?.()
    } catch (caught: unknown) {
      if (request !== generation.current) return
      handleConfirmationError(caught, 'No se pudieron confirmar las coordenadas. Intentá nuevamente.')
    } finally { setWritePending(false) }
  }

  return (
        <div className="grid gap-4">
          <div>
            <Label htmlFor={addressId}>Dirección</Label>
            <div className="flex gap-2">
              <Input id={addressId} value={query} onChange={(event) => { addressEdited.current = true; setQuery(event.target.value); setCandidates([]) }} disabled={busy} />
              <Button type="button" onClick={() => void search()} disabled={busy}>Buscar</Button>
            </div>
          </div>
          {status === 'error' && <p role="alert" className="text-sm text-state-error">{error}</p>}
          {status === 'confirmed' && <p role="status" className="text-sm text-state-success">Ubicación confirmada. Actualizá el dashboard para habilitar la ruta.</p>}
          {status === 'pending' && <p role="status" className="text-sm text-state-success">Ubicación manual guardada. Pendiente de validación.</p>}
          {status === 'unknown' && <p role="status" className="text-sm text-state-warning">Se guardó la referencia, pero no se recibió su estado de validación. Actualizá los datos para verificarlo.</p>}
          {(writing || externalWritePending) && <p role="status" className="text-sm text-text-secondary">Guardando ubicación…</p>}
          {candidates.length === 0 && status === 'idle' && !writing && !externalWritePending && <p role="status" className="text-sm text-text-secondary">No hay candidatos todavía. Si la búsqueda no devuelve resultados, el destino seguirá bloqueado hasta contar con una ubicación válida.</p>}
          {candidates.length > 0 && <ul aria-label="Candidatos de geocodificación" className="grid gap-2">{candidates.map((candidate) => <li key={candidate.placeId} className="rounded-md border border-border-subtle p-3"><p className="text-sm text-text-primary">{candidate.formattedAddress}</p><p className="text-xs text-text-secondary">Precisión: {candidate.precision}</p><Button type="button" size="sm" className="mt-2" onClick={() => void confirm(candidate)} disabled={busy || snapshotLoading || snapshot === null || conflict}>Confirmar esta ubicación</Button></li>)}</ul>}
          <fieldset className="grid gap-3 rounded-md border border-border-subtle p-3">
            <legend className="px-1 text-sm font-medium">Referencia manual</legend>
            <p className="text-sm text-text-secondary">Guardá una referencia pendiente o confirmá coordenadas que ya verificaste.</p>
            {snapshot && <p className="text-sm text-text-secondary">Ubicación actual: {snapshot.address || 'Sin dirección'} · {snapshot.lat ?? '—'}, {snapshot.lng ?? '—'}</p>}
            <LocationMapPicker kind="client" disabled={busy} value={coordinatesFromInputs(latitude, longitude)} onChange={(point) => { if (!writeBlocked()) { coordinatesEdited.current = true; setLatitude(String(point.lat)); setLongitude(String(point.lng)) } }} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label htmlFor={latId}>Latitud</Label><Input id={latId} inputMode="decimal" value={latitude} onChange={(event) => { coordinatesEdited.current = true; setLatitude(event.target.value) }} disabled={busy} /></div>
              <div><Label htmlFor={lngId}>Longitud</Label><Input id={lngId} inputMode="decimal" value={longitude} onChange={(event) => { coordinatesEdited.current = true; setLongitude(event.target.value) }} disabled={busy} /></div>
            </div>
            <Button type="button" onClick={() => void saveManual()} disabled={busy || snapshotLoading || snapshot === null || conflict}>Guardar coordenadas</Button>
            <Button type="button" onClick={() => void confirmManual()} disabled={busy || snapshotLoading || snapshot === null || conflict}>Confirmar coordenadas</Button>
            {(conflict || (snapshot === null && !snapshotLoading)) && <Button type="button" variant="secondary" disabled={busy} onClick={() => { if (writeBlocked()) return; coordinatesEdited.current = false; addressEdited.current = false; setCandidates([]); setStatus('idle'); setError(''); setSnapshotVersion((version) => version + 1) }}>Recargar ubicación</Button>}
          </fieldset>
        </div>
  )
}
