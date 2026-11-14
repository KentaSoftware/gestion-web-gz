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
import { Permission } from '@/interfaces/auth.interface'
import type { ExpectedClientFields, ManagedClient, ManagedClientInput } from '@/interfaces/client.interface'
import { clientService, type ClientZone } from '@/services/client.service'

const PAGE_SIZE = 25

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 409) return 'Los datos cambiaron desde que abriste el cliente. Cerrá el formulario, actualizá la lista y volvé a revisarlos.'
  if (axios.isAxiosError(error) && error.response?.status === 400) return 'Revisá el nombre, los teléfonos y que la zona seleccionada siga activa.'
  if (axios.isAxiosError(error) && error.response?.status === 403) return 'No tenés permiso para realizar esta acción.'
  return 'No se pudo completar la operación. Intentá nuevamente.'
}

function ClientForm({ client, zones, onClose, onSaved }: {
  client: ManagedClient | null
  zones: ClientZone[]
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(client?.nombreCompleto ?? '')
  const [address, setAddress] = useState(client?.address ?? '')
  const [phones, setPhones] = useState(client?.telefonos?.join(', ') ?? '')
  const [zone, setZone] = useState(client?.deliveryZoneId ?? '')
  const [latitude, setLatitude] = useState(client?.lat == null ? '' : String(client.lat))
  const [longitude, setLongitude] = useState(client?.lng == null ? '' : String(client.lng))
  const [coordinatesEdited, setCoordinatesEdited] = useState(false)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (savingRef.current) return
    const parts = phones.split(',').map((part) => part.trim()).filter(Boolean)
    if (!name.trim()) { setError('Ingresá el nombre del cliente.'); return }
    if (parts.some((part) => !/^\d{1,15}$/.test(part) || !Number.isSafeInteger(Number(part)))) {
      setError('Ingresá teléfonos numéricos de hasta 15 dígitos, separados por comas.')
      return
    }
    const emptyCoordinates = latitude.trim() === '' && longitude.trim() === ''
    const point = coordinatesFromInputs(latitude, longitude)
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
      else await clientService.create(input as ManagedClientInput)
      onSaved()
    } catch (caught) { setError(errorMessage(caught)) } finally { savingRef.current = false; setSaving(false) }
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !savingRef.current) onClose() }}>
    <DialogContent className="max-h-[90vh] overflow-y-auto" closeDisabled={saving} onEscapeKeyDown={(event) => { if (savingRef.current) event.preventDefault() }} onInteractOutside={(event) => { if (savingRef.current) event.preventDefault() }}>
      <DialogHeader>
        <DialogTitle>{client ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
        <DialogDescription>Completá los datos de contacto. La ubicación se confirma por separado en Rutas.</DialogDescription>
      </DialogHeader>
      {saving && <p role="status" className="text-sm text-muted-foreground">Guardando cliente…</p>}
      <form onSubmit={submit} className="space-y-4" aria-busy={saving}>
        <fieldset disabled={saving} className="space-y-4">
        <div className="space-y-1"><label htmlFor="client-name">Nombre *</label><Input id="client-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required /></div>
        <div className="space-y-1"><label htmlFor="client-address">Dirección</label><Input id="client-address" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} />{client && <p className="text-sm text-muted-foreground">Cambiar la dirección invalida la confirmación de ubicación existente.</p>}</div>
        <fieldset className="space-y-2">
          <legend className="font-medium">Ubicación en el mapa</legend>
          <p id="client-location-help" className="text-sm text-muted-foreground">Seleccioná un punto en el mapa o ingresá ambas coordenadas. Se guardará como referencia sin confirmar; para planificar entregas debe confirmarse por separado en Rutas.</p>
          <LocationMapPicker kind="client" disabled={saving} value={coordinatesFromInputs(latitude, longitude)} onChange={(point) => { if (!savingRef.current) { setLatitude(String(point.lat)); setLongitude(String(point.lng)); setCoordinatesEdited(true) } }} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><label htmlFor="client-latitude">Latitud</label><Input id="client-latitude" inputMode="decimal" aria-describedby="client-location-help" value={latitude} onChange={(e) => { setLatitude(e.target.value); setCoordinatesEdited(true) }} /></div>
            <div className="space-y-1"><label htmlFor="client-longitude">Longitud</label><Input id="client-longitude" inputMode="decimal" aria-describedby="client-location-help" value={longitude} onChange={(e) => { setLongitude(e.target.value); setCoordinatesEdited(true) }} /></div>
          </div>
          <Button type="button" variant="outline" onClick={() => { setLatitude(''); setLongitude(''); setCoordinatesEdited(true) }}>Quitar ubicación</Button>
          {client && <p className="text-sm text-muted-foreground">Modificar o quitar el punto invalida cualquier confirmación de ubicación anterior.</p>}
        </fieldset>
        <div className="space-y-1"><label htmlFor="client-phones">Teléfonos</label><Input id="client-phones" value={phones} onChange={(e) => setPhones(e.target.value)} placeholder="Ej.: 1123456789, 1145678901" /><p className="text-sm text-muted-foreground">Solo números, separados por comas. Los ceros iniciales no se conservan.</p></div>
        <div className="space-y-1"><label htmlFor="client-zone">Zona de reparto</label><select id="client-zone" className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={zone} onChange={(e) => setZone(e.target.value)}>
          <option value="">Sin zona</option>
          {client?.deliveryZoneId && !zones.some((item) => item._id === client.deliveryZoneId) && <option value={client.deliveryZoneId}>Zona actual no disponible</option>}
          {zones.filter((item) => item.active || item._id === client?.deliveryZoneId).map((item) => <option key={item._id} value={item._id}>{item.name}{item.active ? '' : ' (inactiva)'}</option>)}
        </select></div>
        </fieldset>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}

function ClientsContent() {
  const { hasPermission } = usePermission()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [clients, setClients] = useState<ManagedClient[]>([])
  const [zones, setZones] = useState<ClientZone[]>([])
  const [zoneError, setZoneError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [editing, setEditing] = useState<ManagedClient | null | undefined>(undefined)
  const [statusClient, setStatusClient] = useState<ManagedClient | null>(null)
  const [saving, setSaving] = useState(false)

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
    <PageHeader title="Clientes" actions={hasPermission(Permission.CREATE_CLIENT) && <Button disabled={zoneError} onClick={() => setEditing(null)}>Nuevo cliente</Button>}>
      <label htmlFor="client-search" className="sr-only">Buscar clientes</label>
      <Input id="client-search" placeholder="Buscar clientes" value={search} maxLength={100} onChange={(e) => { setSearch(e.target.value); setPage(0) }} />
    </PageHeader>
    {zoneError && <p role="alert" className="p-4 text-sm text-destructive">No se pudieron cargar las zonas. Recargá la página para editar clientes.</p>}
    {error && <div className="p-4"><p role="alert" className="text-sm text-destructive">{error}</p><Button variant="outline" className="mt-2" onClick={() => setRefresh((value) => value + 1)}>Actualizar lista</Button></div>}
    {loading ? <p role="status" className="p-6">Cargando clientes…</p> : !error && clients.length === 0 ? <p className="p-6 text-muted-foreground">No hay clientes para mostrar.</p> : !error && <ul className="divide-y">
      {clients.slice(0, PAGE_SIZE).map((client) => <li key={client._id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><p className="font-semibold">{client.nombreCompleto}</p><p className="text-sm text-muted-foreground">{client.address || 'Sin dirección'} · {client.telefonos?.join(', ') || 'Sin teléfono'}</p><p className="text-sm">{client.isActive === true ? 'Activo' : client.isActive === false ? 'Inactivo' : 'Sin estado — no disponible para ventas'}</p></div>
        {hasPermission(Permission.UPDATE_CLIENT) && <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={zoneError} onClick={() => setEditing(client)}>Editar</Button><Button variant="outline" onClick={() => setStatusClient(client)}>{client.isActive === true ? 'Desactivar' : 'Activar'}</Button></div>}
      </li>)}
    </ul>}
    <div className="flex items-center gap-3 py-4"><Button variant="outline" disabled={page === 0 || loading || !!error} onClick={() => setPage((value) => value - 1)}>Anterior</Button><span>Página {page + 1}</span><Button variant="outline" disabled={clients.length <= PAGE_SIZE || loading || !!error} onClick={() => setPage((value) => value + 1)}>Siguiente</Button></div>
    {editing !== undefined && <ClientForm client={editing} zones={zones} onClose={() => { setEditing(undefined); setRefresh((value) => value + 1) }} onSaved={() => { setEditing(undefined); setRefresh((value) => value + 1) }} />}
    <Dialog open={statusClient !== null} onOpenChange={(open) => { if (!open && !saving) setStatusClient(null) }}><DialogContent><DialogHeader><DialogTitle>{statusClient?.isActive === true ? 'Desactivar cliente' : 'Activar cliente'}</DialogTitle><DialogDescription>{statusClient?.isActive === true ? 'No aparecerá para nuevas ventas y sus entregas pendientes no podrán incluirse en nuevas rutas mientras esté inactivo. Su historial se conservará y podrás activarlo nuevamente.' : 'El cliente volverá a estar disponible para nuevas ventas.'}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={saving} onClick={() => setStatusClient(null)}>Cancelar</Button><Button disabled={saving} onClick={changeStatus}>{saving ? 'Guardando…' : 'Confirmar'}</Button></DialogFooter></DialogContent></Dialog>
  </PageContainer>
}

export default function ClientsPage() {
  return <ProtectedRoute requiredPermission={Permission.READ_CLIENT}><ClientsContent /></ProtectedRoute>
}
