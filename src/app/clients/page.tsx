'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import axios from 'axios'
import ProtectedRoute from '@/components/ProtectedRoute'
import { PageContainer, PageHeader } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { coordinatesFromInputs, LocationMapPicker } from '@/components/route/LocationMapPicker'
import { usePermission } from '@/hooks/usePermission'
import { Permission, SESSION_STATUS } from '@/interfaces/auth.interface'
import { useAppSelector } from '@/redux/hook'
import { getUser } from '@/redux/userSlice'
import type { ClientLocationSnapshot, ExpectedClientFields, ManagedClient, ManagedClientInput } from '@/interfaces/client.interface'
import { clientService, type ClientZone } from '@/services/client.service'

const PAGE_SIZE = 25
const RECOVERY_KEY = 'client-create-recovery-v2:'
const LEGACY_RECOVERY_KEY = 'client-create-recovery-v1'
const MAX_RECOVERY_LENGTH = 16384

interface CreateRecovery {
  input: ManagedClientInput
  id?: string
  confirm: boolean
}

function parseRecovery(raw: string): CreateRecovery {
  if (raw.length > MAX_RECOVERY_LENGTH) throw new Error('Invalid recovery')
  const value: unknown = JSON.parse(raw)
  if (!value || typeof value !== 'object' || !('input' in value) || !('confirm' in value) || typeof value.confirm !== 'boolean' || !value.input || typeof value.input !== 'object') throw new Error('Invalid recovery')
  const input = value.input as Record<string, unknown>
  if (typeof input.nombreCompleto !== 'string' || !input.nombreCompleto.trim() || input.nombreCompleto.length > 200 || !Array.isArray(input.telefonos) || input.telefonos.length > 256 || input.telefonos.some((phone: unknown) => !Number.isSafeInteger(phone) || Number(phone) < 0) || (input.address !== undefined && (typeof input.address !== 'string' || input.address.length > 300)) || (input.deliveryZoneId !== undefined && (typeof input.deliveryZoneId !== 'string' || input.deliveryZoneId.length > 128)) || (input.isActive !== undefined && typeof input.isActive !== 'boolean') || (('lat' in input || 'lng' in input) && (typeof input.lat !== 'number' || typeof input.lng !== 'number' || !Number.isFinite(input.lat) || !Number.isFinite(input.lng) || Math.abs(input.lat) > 90 || Math.abs(input.lng) > 180)) || ('id' in value && (typeof value.id !== 'string' || !value.id || value.id.length > 128))) throw new Error('Invalid recovery')
  if (value.confirm && (typeof input.lat !== 'number' || typeof input.lng !== 'number')) throw new Error('Invalid recovery')
  return value as CreateRecovery
}

function readRecovery(key: string): CreateRecovery | null {
  const raw = localStorage.getItem(key)
  return raw === null ? null : parseRecovery(raw)
}

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 409) return 'Los datos cambiaron desde que abriste el cliente. Cerrá el formulario, actualizá la lista y volvé a revisarlos.'
  if (axios.isAxiosError(error) && error.response?.status === 400) return 'Revisá el nombre, los teléfonos y que la zona seleccionada siga activa.'
  if (axios.isAxiosError(error) && error.response?.status === 403) return 'No tenés permiso para realizar esta acción.'
  return 'No se pudo completar la operación. Intentá nuevamente.'
}

function ClientForm({ client, zones, onClose, onSaved, recovery, onRecovery, canConfirm, canEdit, recoveryKey }: {
  client: ManagedClient | null
  zones: ClientZone[]
  onClose: () => void
  onSaved: () => void
  recovery: CreateRecovery | null
  onRecovery: (value: CreateRecovery | null) => void
  canConfirm: boolean
  canEdit: boolean
  recoveryKey: string
}) {
  const initial = client ?? recovery?.input
  const [name, setName] = useState(initial?.nombreCompleto ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [phones, setPhones] = useState(initial?.telefonos?.join(', ') ?? '')
  const [zone, setZone] = useState(initial?.deliveryZoneId ?? '')
  const [latitude, setLatitude] = useState(initial?.lat == null ? '' : String(initial.lat))
  const [longitude, setLongitude] = useState(initial?.lng == null ? '' : String(initial.lng))
  const [coordinatesEdited, setCoordinatesEdited] = useState(false)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [error, setError] = useState('')
  const [snapshot, setSnapshot] = useState<ClientLocationSnapshot | null>(null)
  const [acknowledged, setAcknowledged] = useState(false)
  const [idRecorded, setIdRecorded] = useState(false)
  const [recoveryStorageFailed, setRecoveryStorageFailed] = useState(false)
  const [reviewRequired, setReviewRequired] = useState(false)
  const mounted = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  const dirty = !!client && (name !== client.nombreCompleto || address !== (client.address ?? '') || phones !== (client.telefonos?.join(', ') ?? '') || zone !== (client.deliveryZoneId ?? '') || latitude !== (client.lat == null ? '' : String(client.lat)) || longitude !== (client.lng == null ? '' : String(client.lng)))
  const savedPoint = client && client.lat != null && client.lng != null ? coordinatesFromInputs(String(client.lat), String(client.lng)) : null

  async function confirmSavedLocation() {
    if (!client || !canConfirm || !savedPoint || dirty || reviewRequired || savingRef.current) return
    savingRef.current = true; setSaving(true); setError('')
    try {
      const current = await clientService.locationSnapshot(client._id)
      if (!mounted.current) return
      if (current.address !== (client.address ?? null) || current.lat !== client.lat || current.lng !== client.lng || current.locationRevision !== client.locationRevision) {
        setReviewRequired(true)
        setError('La ubicación cambió. Cerrá el formulario, actualizá la lista y revisá la ubicación antes de confirmar.')
        return
      }
      await clientService.confirmLocation(client._id, { manualConfirmation: savedPoint, expectedLocation: current })
      if (mounted.current) onSaved()
    } catch {
      if (mounted.current) {
        setReviewRequired(true)
        setError('No se pudo confirmar o el resultado es incierto. Cerrá el formulario, actualizá la lista y revisá la ubicación antes de confirmar.')
      }
    } finally {
      savingRef.current = false
      if (mounted.current) setSaving(false)
    }
  }

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (savingRef.current || recoveryStorageFailed) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [recoveryStorageFailed])

  function storeRecovery(value: CreateRecovery | null) {
    if (value) {
      const raw = JSON.stringify(value)
      parseRecovery(raw)
      localStorage.setItem(recoveryKey, raw)
    } else localStorage.removeItem(recoveryKey)
    onRecovery(value)
  }

  async function retryPersistId() {
    if (!recoveryStorageFailed || !recovery?.id || savingRef.current) return
    if (!navigator.locks) { setError('No se puede proteger la recuperación entre pestañas. Conservá el ID mostrado.'); return }
    savingRef.current = true; setSaving(true)
    try {
      await navigator.locks.request(recoveryKey, { ifAvailable: true }, (lock) => {
        if (!lock) { setError('Hay una operación en curso en otra pestaña. Conservá el ID y volvé a intentar.'); return }
        const current = readRecovery(recoveryKey)
        if (!current || (current.id !== undefined && current.id !== recovery.id) || current.confirm !== recovery.confirm || JSON.stringify(current.input) !== JSON.stringify(recovery.input)) {
          setError('La recuperación guardada cambió. No se sobrescribió; conservá el ID y revisá los datos antes de continuar.')
          return
        }
        storeRecovery(recovery)
        setRecoveryStorageFailed(false)
        setError('')
      })
    } catch { setError('No se pudo guardar la identificación. Conservá el ID y volvé a intentar.') }
    finally { savingRef.current = false; setSaving(false) }
  }

  async function reviewLocation() {
    if (!recovery?.id || savingRef.current || !canConfirm) return
    savingRef.current = true; setSaving(true); setError(''); setSnapshot(null)
    try { setSnapshot(await clientService.locationSnapshot(recovery.id)) }
    catch { setError('El cliente ya fue creado. No se pudo cargar la ubicación actual; intentá revisarla nuevamente.') }
    finally { savingRef.current = false; setSaving(false) }
  }

  async function confirmReviewed(id: string, reviewed: ClientLocationSnapshot, point: { lat: number, lng: number }) {
    try {
      await clientService.confirmLocation(id, { manualConfirmation: point, expectedLocation: reviewed })
      storeRecovery(null)
      onSaved()
    } catch {
      setSnapshot(null)
      setError('El cliente ya fue creado, pero la confirmación falló o su resultado es incierto. Revisá la ubicación actual antes de volver a confirmar.')
    }
  }

  async function retryConfirmation() {
    const point = coordinatesFromInputs(latitude, longitude)
    if (!recovery?.id || !snapshot || !point || !canConfirm || savingRef.current || !navigator.locks) return
    savingRef.current = true; setSaving(true); setError('')
    try { await navigator.locks.request(recoveryKey, { ifAvailable: true }, async (lock) => {
      if (!lock) { setError('Hay una operación en curso en otra pestaña.'); return }
      const current = readRecovery(recoveryKey)
      if (!current || current.id !== recovery.id) { setSnapshot(null); setError('La recuperación cambió en otra pestaña. Cerrá y revisá el estado actual.'); return }
      await confirmReviewed(recovery.id!, snapshot, point)
    }) } catch { setSnapshot(null); setError('No se pudo verificar la recuperación. No se confirmó la ubicación.') }
    finally { savingRef.current = false; setSaving(false) }
  }

  async function submit(event: Pick<FormEvent, 'preventDefault'>, confirm = false) {
    event.preventDefault()
    if (savingRef.current || recovery || (client && !canEdit) || (confirm && (!canConfirm || client))) return
    const parts = phones.split(',').map((part) => part.trim()).filter(Boolean)
    if (!name.trim()) { setError('Ingresá el nombre del cliente.'); return }
    if (parts.some((part) => !/^\d{1,15}$/.test(part) || !Number.isSafeInteger(Number(part)))) {
      setError('Ingresá teléfonos numéricos de hasta 15 dígitos, separados por comas.')
      return
    }
    const emptyCoordinates = latitude.trim() === '' && longitude.trim() === ''
    const point = coordinatesFromInputs(latitude, longitude)
    if (confirm && (!coordinatesEdited || point === null)) { setError('Seleccioná o ingresá ambas coordenadas válidas antes de confirmar.'); return }
    if (coordinatesEdited && !emptyCoordinates && point === null) {
      setError('Ingresá ambas coordenadas válidas: latitud entre -90 y 90 y longitud entre -180 y 180.')
      return
    }
    savingRef.current = true
    setSaving(true)
    setError('')
    const normalizedPhones = parts.map(Number)
    const input: Partial<ManagedClientInput> = {}
    if (!client) {
      input.nombreCompleto = name.trim()
      input.telefonos = normalizedPhones
      input.isActive = true
      if (address.trim()) input.address = address.trim()
      if (zone) input.deliveryZoneId = zone
      if (coordinatesEdited && point) { input.lat = point.lat; input.lng = point.lng }
    } else {
      const expectedFields: ExpectedClientFields = {}
      if (name.trim() !== client.nombreCompleto) {
        input.nombreCompleto = name.trim()
        expectedFields.nombreCompleto = client.nombreCompleto ?? null
      }
      if (JSON.stringify(normalizedPhones) !== JSON.stringify(client.telefonos ?? [])) {
        input.telefonos = normalizedPhones
        expectedFields.telefonos = client.telefonos ?? null
      }
      if (address.trim() !== (client.address ?? '')) {
        input.address = address.trim() || null
      }
      if (coordinatesEdited && ((point?.lat ?? null) !== (client.lat ?? null) || (point?.lng ?? null) !== (client.lng ?? null))) {
        input.lat = point?.lat ?? null
        input.lng = point?.lng ?? null
      }
      if ('address' in input || 'lat' in input) input.expectedLocation = { address: client.address ?? null, lat: client.lat ?? null, lng: client.lng ?? null, locationRevision: client.locationRevision ?? 0 }
      if (zone !== (client.deliveryZoneId ?? '')) {
        input.deliveryZoneId = zone || null
        expectedFields.deliveryZoneId = client.deliveryZoneId ?? null
      }
      if (Object.keys(input).length === 0) { savingRef.current = false; setSaving(false); onClose(); return }
      input.expectedFields = expectedFields
    }
    try {
      if (client) await clientService.update(client._id, input)
      else {
        if (!navigator.locks || !recoveryKey) { setError('No se puede proteger la creación entre pestañas. Usá un navegador compatible y seguro.'); return }
        await navigator.locks.request(recoveryKey, { ifAvailable: true }, async (lock) => {
        if (!lock) { setError('Hay otra creación en curso en otra pestaña. Esperá y revisá el cliente antes de continuar.'); return }
        let existing: CreateRecovery | null
        try { existing = readRecovery(recoveryKey) } catch { setError('No se pudo leer la recuperación guardada. No se creó el cliente.'); return }
        if (existing) { setError('Hay una creación pendiente. Cerrá y retomá la recuperación.'); return }
        const pending: CreateRecovery = { input: input as ManagedClientInput, confirm }
        try { storeRecovery(pending) } catch { setError('No se pudo guardar el estado de recuperación. No se creó el cliente.'); return }
        let created: { _id: string }
        try { created = await clientService.create(pending.input) } catch {
          setError('No se sabe si el cliente fue creado. Buscalo antes de intentar crear otro.')
          return
        }
        if (!created || typeof created._id !== 'string' || !created._id || created._id.length > 128) { setError('El cliente podría haberse creado, pero no se recibió su identificador. Buscalo antes de crear otro.'); return }
        const saved = { ...pending, id: created._id }
        try { storeRecovery(saved) } catch { onRecovery(saved); setRecoveryStorageFailed(true); setError(`El cliente ya fue creado (ID: ${created._id}), pero no se pudo guardar su identificación para recuperar la operación. Anotá el ID antes de salir.`); return }
        if (confirm && point) {
          let reviewed: ClientLocationSnapshot
          try { reviewed = await clientService.locationSnapshot(created._id) } catch { setError('El cliente ya fue creado. No se pudo cargar la ubicación actual; revisala antes de confirmar.'); return }
          if (reviewed.locationRevision !== 0 || reviewed.address !== (pending.input.address ?? null) || reviewed.lat !== point.lat || reviewed.lng !== point.lng) {
            setError('El cliente ya fue creado, pero su ubicación cambió. Revisá la ubicación actual antes de confirmar.'); return
          }
          await confirmReviewed(created._id, reviewed, point)
          return
        }
        storeRecovery(null)
        onSaved()
        })
        return
      }
      onSaved()
    } catch (caught) { setError(errorMessage(caught)) } finally { savingRef.current = false; setSaving(false) }
  }

  if (client && !canEdit) return <Dialog open onOpenChange={(open) => { if (!open && !savingRef.current) onClose() }}>
    <DialogContent closeDisabled={saving} onEscapeKeyDown={(event) => { if (savingRef.current) event.preventDefault() }} onInteractOutside={(event) => { if (savingRef.current) event.preventDefault() }}>
      <DialogHeader><DialogTitle>Revisar ubicación</DialogTitle><DialogDescription>Revisá los datos guardados antes de confirmar la ubicación.</DialogDescription></DialogHeader>
      <div className="space-y-2"><p>Cliente: {client.nombreCompleto}</p><p>Dirección: {client.address || 'Sin dirección'}</p><p>Coordenadas: {client.lat ?? '—'}, {client.lng ?? '—'}</p></div>
      {!savedPoint && <p className="text-sm text-muted-foreground">Se necesitan coordenadas guardadas válidas para confirmar la ubicación.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cerrar</Button>{canConfirm && <Button type="button" disabled={!savedPoint || reviewRequired || saving} onClick={() => void confirmSavedLocation()}>Confirmar ubicación guardada</Button>}</DialogFooter>
    </DialogContent>
  </Dialog>

  return <Dialog open onOpenChange={(open) => { if (!open && !savingRef.current && !recoveryStorageFailed) onClose() }}>
    <DialogContent className={client ? 'max-h-[90vh] overflow-y-auto' : 'flex h-[95vh] h-[95dvh] flex-col overflow-y-auto'} closeDisabled={saving || recoveryStorageFailed} onEscapeKeyDown={(event) => { if (savingRef.current || recoveryStorageFailed) event.preventDefault() }} onInteractOutside={(event) => { if (savingRef.current || recoveryStorageFailed) event.preventDefault() }}>
      <DialogHeader>
        <DialogTitle>{client ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
        <DialogDescription>Completá los datos de contacto. La ubicación se confirma por separado.</DialogDescription>
      </DialogHeader>
      {saving && <p role="status" className="text-sm text-muted-foreground">Guardando cliente…</p>}
      <form onSubmit={(event) => void submit(event)} className={client ? 'space-y-4' : 'flex flex-1 flex-col gap-4'} aria-busy={saving}>
        <fieldset disabled={saving || !!recovery} className={client ? 'space-y-4' : 'flex flex-1 flex-col gap-4'}>
        <div className="space-y-1"><label htmlFor="client-name">Nombre *</label><Input id="client-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required /></div>
        <div className="space-y-1"><label htmlFor="client-address">Dirección</label><Input id="client-address" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} />{client && <p className="text-sm text-muted-foreground">Cambiar la dirección invalida la confirmación de ubicación existente.</p>}</div>
        <fieldset className={client ? 'space-y-2' : 'flex flex-1 flex-col gap-2'}>
          <legend className="font-medium">Ubicación en el mapa</legend>
          <p id="client-location-help" className="text-sm text-muted-foreground">Seleccioná un punto en el mapa o ingresá ambas coordenadas. Se guardará como referencia sin confirmar; para planificar entregas debe confirmarse por separado en Rutas.</p>
          <LocationMapPicker kind="client" disabled={saving || !!recovery} value={coordinatesFromInputs(latitude, longitude)} {...(!client && { defaultCenter: { lat: -26.9, lng: -65.3 }, defaultZoom: 8, mapClassName: 'flex-1 min-h-64' })} onChange={(point) => { if (!savingRef.current && !recovery) { setLatitude(String(point.lat)); setLongitude(String(point.lng)); setCoordinatesEdited(true) } }} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><label htmlFor="client-latitude">Latitud</label><Input id="client-latitude" inputMode="decimal" aria-describedby="client-location-help" value={latitude} onChange={(e) => { setLatitude(e.target.value); setCoordinatesEdited(true) }} /></div>
            <div className="space-y-1"><label htmlFor="client-longitude">Longitud</label><Input id="client-longitude" inputMode="decimal" aria-describedby="client-location-help" value={longitude} onChange={(e) => { setLongitude(e.target.value); setCoordinatesEdited(true) }} /></div>
          </div>
          <Button type="button" variant="outline" onClick={() => { setLatitude(''); setLongitude(''); setCoordinatesEdited(true) }}>Quitar ubicación</Button>
          {!client && canConfirm && <Button type="button" disabled={!coordinatesEdited || !coordinatesFromInputs(latitude, longitude)} onClick={(event) => { const form = event.currentTarget.form; if (form?.reportValidity()) void submit(event, true) }}>Guardar y confirmar ubicación</Button>}
          {client && canConfirm && <>
            <Button type="button" variant="outline" disabled={!savedPoint || dirty || reviewRequired || saving} onClick={() => void confirmSavedLocation()}>Confirmar ubicación guardada</Button>
            {dirty && <p className="text-sm text-muted-foreground">Guardá los cambios antes de confirmar la ubicación.</p>}
            {!savedPoint && <p className="text-sm text-muted-foreground">Guardá coordenadas válidas antes de confirmar la ubicación.</p>}
          </>}
          {client && <p className="text-sm text-muted-foreground">Modificar o quitar el punto invalida cualquier confirmación de ubicación anterior.</p>}
        </fieldset>
        <div className="space-y-1"><label htmlFor="client-phones">Teléfonos</label><Input id="client-phones" value={phones} onChange={(e) => setPhones(e.target.value)} placeholder="Ej.: 1123456789, 1145678901" /><p className="text-sm text-muted-foreground">Solo números, separados por comas. Los ceros iniciales no se conservan.</p></div>
        <div className="space-y-1"><label htmlFor="client-zone">Zona de reparto</label><select id="client-zone" className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={zone} onChange={(e) => setZone(e.target.value)}>
          <option value="">Sin zona</option>
          {client?.deliveryZoneId && !zones.some((item) => item._id === client.deliveryZoneId) && <option value={client.deliveryZoneId}>Zona actual no disponible</option>}
          {zones.filter((item) => item.active || item._id === client?.deliveryZoneId).map((item) => <option key={item._id} value={item._id}>{item.name}{item.active ? '' : ' (inactiva)'}</option>)}
        </select></div>
        </fieldset>
        {recovery && !saving && <div className="space-y-2">
          <p>{recovery.id ? `El cliente ya fue creado (ID: ${recovery.id}). Los datos están bloqueados para evitar diferencias; cerrá y editalos desde la lista.` : 'No se sabe si el cliente fue creado. Buscalo en la lista antes de crear otro.'}</p>
          {recoveryStorageFailed && recovery.id && <div className="space-y-2">
            <label htmlFor="created-client-id">ID del cliente creado</label>
            <Input id="created-client-id" value={recovery.id} readOnly onFocus={(event) => event.currentTarget.select()} />
            <p>Copiá o anotá este ID. Si salís sin guardarlo, no podremos recuperarlo automáticamente; no vuelvas a crear el cliente.</p>
            <Button type="button" variant="outline" onClick={() => void retryPersistId()}>Reintentar guardar identificación</Button>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={idRecorded} onChange={(event) => setIdRecorded(event.target.checked)} />Anoté el ID y entiendo que no está guardado para recuperación automática.</label>
            <Button type="button" variant="outline" disabled={!idRecorded} onClick={onClose}>Cerrar con ID anotado</Button>
          </div>}
          {!recoveryStorageFailed && recovery.id && recovery.confirm && canConfirm && <>
            <Button type="button" variant="outline" onClick={() => void reviewLocation()}>Revisar ubicación actual</Button>
            {snapshot && <><p>Ubicación actual: {snapshot.address || 'Sin dirección'} · {snapshot.lat ?? '—'}, {snapshot.lng ?? '—'} · revisión {snapshot.locationRevision}. Las coordenadas a confirmar son {latitude}, {longitude}.</p><Button type="button" onClick={() => void retryConfirmation()}>Confirmar ubicación revisada</Button></>}
          </>}
          {!recoveryStorageFailed && <><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />{recovery.id ? 'Entiendo que el cliente ya existe y que su ubicación puede no estar confirmada.' : 'Ya busqué el cliente y entiendo que podría existir; no reintentaré sin verificar.'}</label>
          <Button type="button" variant="outline" disabled={!acknowledged} onClick={() => { if (!navigator.locks) { setError('No se puede proteger la recuperación entre pestañas.'); return }; void navigator.locks.request(recoveryKey, { ifAvailable: true }, (lock) => { if (!lock) { setError('Hay una operación en curso en otra pestaña.'); return }; try { const current = readRecovery(recoveryKey); if (!current || current.id !== recovery.id || JSON.stringify(current.input) !== JSON.stringify(recovery.input)) { setError('La recuperación cambió en otra pestaña. Cerrá y revisá el estado actual.'); return }; storeRecovery(null); onSaved() } catch { setError('No se pudo cerrar la recuperación. Los datos siguen guardados.') } }).catch(() => setError('No se pudo cerrar la recuperación. Los datos siguen guardados.')) }}>{recovery.id ? 'Finalizar sin confirmar' : 'Cerrar recuperación'}</Button></>}
        </div>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter><Button type="button" variant="outline" disabled={saving || recoveryStorageFailed} onClick={onClose}>{recovery && !saving ? 'Cerrar' : 'Cancelar'}</Button>{!recovery && <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>}</DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}

function ClientsContent() {
  const { hasPermission } = usePermission()
  const user = useAppSelector(getUser)
  const recoveryKey = user.sessionStatus === SESSION_STATUS.READY && user.id && user.id.length <= 128 ? `${RECOVERY_KEY}${encodeURIComponent(user.id)}` : ''
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [clients, setClients] = useState<ManagedClient[]>([])
  const [zones, setZones] = useState<ClientZone[]>([])
  const [zoneError, setZoneError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [editing, setEditing] = useState<ManagedClient | null | undefined>(undefined)
  const [reviewOnly, setReviewOnly] = useState(false)
  const [statusClient, setStatusClient] = useState<ManagedClient | null>(null)
  const [saving, setSaving] = useState(false)
  const [recovery, setRecovery] = useState<CreateRecovery | null>(null)
  const [recoveryError, setRecoveryError] = useState('')

  useEffect(() => {
    if (!recoveryKey) { setRecovery(null); return }
    const load = () => { try {
      if (sessionStorage.getItem(LEGACY_RECOVERY_KEY)) throw new Error('Legacy recovery')
      const current = readRecovery(recoveryKey)
      if (editing === undefined) setRecovery(current)
      setRecoveryError('')
    } catch { setRecoveryError('No se puede leer la recuperación anterior o el almacenamiento. No crees otro cliente hasta revisar los datos guardados.') } }
    load()
    window.addEventListener('storage', load)
    return () => window.removeEventListener('storage', load)
  }, [recoveryKey, editing])

  useEffect(() => {
    let current = true
    setLoading(true)
    setError('')
    const timer = window.setTimeout(() => {
      clientService.list(search.trim(), page * PAGE_SIZE, PAGE_SIZE + 1).then((items) => {
        if (current) setClients(items)
      }).catch((caught: unknown) => { if (current) setError(errorMessage(caught)) }).finally(() => { if (current) setLoading(false) })
    }, 250)
    return () => { current = false; window.clearTimeout(timer) }
  }, [search, page, refresh])

  useEffect(() => {
    let current = true
    clientService.zones().then((items) => { if (current) setZones(items) }).catch(() => { if (current) setZoneError(true) })
    return () => { current = false }
  }, [])

  async function changeStatus() {
    if (!statusClient) return
    setSaving(true)
    setError('')
    try {
      await clientService.update(statusClient._id, { isActive: statusClient.isActive !== true, expectedFields: { isActive: statusClient.isActive ?? null } })
      setStatusClient(null)
      setRefresh((value) => value + 1)
    } catch (caught) { setError(errorMessage(caught)); setStatusClient(null) } finally { setSaving(false) }
  }

  return <PageContainer>
    <PageHeader title="Clientes" actions={hasPermission(Permission.CREATE_CLIENT) && <Button disabled={zoneError || !recoveryKey || !!recoveryError} onClick={() => { setReviewOnly(false); setEditing(null) }}>{recovery ? 'Retomar creación pendiente' : 'Nuevo cliente'}</Button>}>
      <label htmlFor="client-search" className="sr-only">Buscar clientes</label>
      <Input id="client-search" placeholder="Buscar clientes" value={search} maxLength={100} onChange={(e) => { setSearch(e.target.value); setPage(0) }} />
    </PageHeader>
    {zoneError && <p role="alert" className="p-4 text-sm text-destructive">No se pudieron cargar las zonas. Recargá la página para editar clientes.</p>}
    {recoveryError && <p role="alert" className="p-4 text-sm text-destructive">{recoveryError}</p>}
    {error && <div className="p-4"><p role="alert" className="text-sm text-destructive">{error}</p><Button variant="outline" className="mt-2" onClick={() => setRefresh((value) => value + 1)}>Actualizar lista</Button></div>}
    {loading ? <p role="status" className="p-6">Cargando clientes…</p> : !error && clients.length === 0 ? <p className="p-6 text-muted-foreground">No hay clientes para mostrar.</p> : !error && <ul className="divide-y">
      {clients.slice(0, PAGE_SIZE).map((client) => <li key={client._id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><p className="font-semibold">{client.nombreCompleto}</p><p className="text-sm text-muted-foreground">{client.address || 'Sin dirección'} · {client.telefonos?.join(', ') || 'Sin teléfono'}</p><p className="text-sm">{client.isActive === true ? 'Activo' : client.isActive === false ? 'Inactivo' : 'Sin estado — no disponible para ventas'}</p></div>
        {hasPermission(Permission.UPDATE_CLIENT) && <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={zoneError} onClick={() => { setReviewOnly(false); setEditing(client) }}>Editar</Button><Button variant="outline" onClick={() => setStatusClient(client)}>{client.isActive === true ? 'Desactivar' : 'Activar'}</Button></div>}
        {(!hasPermission(Permission.UPDATE_CLIENT) || zoneError) && hasPermission('confirm_client_location') && <Button variant="outline" onClick={() => { setReviewOnly(true); setEditing(client) }}>Revisar ubicación</Button>}
      </li>)}
    </ul>}
    <div className="flex items-center gap-3 py-4"><Button variant="outline" disabled={page === 0 || loading || !!error} onClick={() => setPage((value) => value - 1)}>Anterior</Button><span>Página {page + 1}</span><Button variant="outline" disabled={clients.length <= PAGE_SIZE || loading || !!error} onClick={() => setPage((value) => value + 1)}>Siguiente</Button></div>
    {editing !== undefined && <ClientForm client={editing} zones={zones} recoveryKey={recoveryKey} recovery={editing === null ? recovery : null} onRecovery={setRecovery} canEdit={!reviewOnly && hasPermission(Permission.UPDATE_CLIENT)} canConfirm={(editing !== null || hasPermission(Permission.CREATE_CLIENT)) && hasPermission('confirm_client_location')} onClose={() => { setEditing(undefined); setRefresh((value) => value + 1) }} onSaved={() => { setEditing(undefined); setRefresh((value) => value + 1) }} />}
    <Dialog open={statusClient !== null} onOpenChange={(open) => { if (!open && !saving) setStatusClient(null) }}><DialogContent><DialogHeader><DialogTitle>{statusClient?.isActive === true ? 'Desactivar cliente' : 'Activar cliente'}</DialogTitle><DialogDescription>{statusClient?.isActive === true ? 'No aparecerá para nuevas ventas y sus entregas pendientes no podrán incluirse en nuevas rutas mientras esté inactivo. Su historial se conservará y podrás activarlo nuevamente.' : 'El cliente volverá a estar disponible para nuevas ventas.'}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={saving} onClick={() => setStatusClient(null)}>Cancelar</Button><Button disabled={saving} onClick={changeStatus}>{saving ? 'Guardando…' : 'Confirmar'}</Button></DialogFooter></DialogContent></Dialog>
  </PageContainer>
}

export default function ClientsPage() {
  return <ProtectedRoute requiredPermission={Permission.READ_CLIENT}><ClientsContent /></ProtectedRoute>
}
