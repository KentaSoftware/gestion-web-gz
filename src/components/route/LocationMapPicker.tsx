'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { APIProvider, APILoadingStatus, Map, Marker, useApiLoadingStatus, useMap, type MapMouseEvent } from '@vis.gl/react-google-maps'
import { Button } from '@/components/ui/button'

export interface LocationPoint { lat: number; lng: number }

export const coordinatesFromInputs = (latitude: string, longitude: string): LocationPoint | null => {
  if (latitude.trim() === '' || longitude.trim() === '') return null
  const lat = Number(latitude)
  const lng = Number(longitude)
  return Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lng) && Math.abs(lng) <= 180 ? { lat, lng } : null
}

interface LocationMapPickerProps {
  value: LocationPoint | null
  onChange: (point: LocationPoint) => void
  kind: 'origin' | 'client'
  address?: string
}

function PickerCanvas({ value, onChange, kind, address }: LocationMapPickerProps) {
  const status = useApiLoadingStatus()
  const mapId = useId()
  const map = useMap(mapId)
  const [error, setError] = useState('')
  const [searching, setSearching] = useState(false)
  const generation = useRef(0)

  const lat = value?.lat
  const lng = value?.lng
  useEffect(() => {
    if (lat !== undefined && lng !== undefined) map?.panTo({ lat, lng })
  }, [map, lat, lng])
  useEffect(() => () => { generation.current += 1 }, [])
  useEffect(() => { generation.current += 1; setSearching(false) }, [address])
  useEffect(() => { generation.current += 1; setSearching(false) }, [lat, lng])

  const emit = (point: LocationPoint | null) => {
    if (point !== null && Number.isFinite(point.lat) && Math.abs(point.lat) <= 90 && Number.isFinite(point.lng) && Math.abs(point.lng) <= 180) {
      generation.current += 1
      setSearching(false)
      onChange(point)
    }
  }

  const search = async () => {
    if (!address?.trim() || status !== APILoadingStatus.LOADED || typeof google === 'undefined') {
      setError('No se pudo buscar la dirección. Ingresá las coordenadas manualmente.')
      return
    }
    const request = ++generation.current
    setSearching(true)
    setError('')
    try {
      const result = await new google.maps.Geocoder().geocode({ address: address.trim() })
      if (request !== generation.current) return
      const location = result.results[0]?.geometry.location
      if (!location) throw new Error('No result')
      emit({ lat: location.lat(), lng: location.lng() })
    } catch {
      if (request === generation.current) setError('No se pudo buscar la dirección. Ingresá las coordenadas manualmente.')
    } finally {
      if (request === generation.current) setSearching(false)
    }
  }

  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) return <p role="alert" className="text-sm text-state-warning">No se pudo cargar el mapa. Ingresá las coordenadas manualmente.</p>
  if (status !== APILoadingStatus.LOADED) return <p role="status" className="text-sm text-text-secondary">Cargando mapa…</p>
  return <div className="grid gap-2">
    {kind === 'origin' && <Button type="button" variant="secondary" onClick={() => void search()} disabled={searching}>Buscar dirección del depósito</Button>}
    {error && <p role="alert" className="text-sm text-state-warning">{error}</p>}
    <div className="h-64 overflow-hidden rounded-md border border-border-subtle" aria-label={kind === 'origin' ? 'Mapa del depósito' : 'Mapa del cliente'}>
      <Map id={mapId} defaultCenter={value ?? { lat: -34.6, lng: -58.4 }} defaultZoom={12} gestureHandling="cooperative" onClick={(event: MapMouseEvent) => emit(event.detail.latLng)}>
        {value !== null && <Marker position={value} draggable onDragEnd={(event: google.maps.MapMouseEvent) => emit(event.latLng?.toJSON() ?? null)} title={kind === 'origin' ? 'Depósito' : 'Cliente'} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: kind === 'origin' ? '#3e68a4' : '#d32f2f', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2 }} />}
      </Map>
    </div>
  </div>
}

export function LocationMapPicker(props: LocationMapPickerProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey?.trim()) return <p role="alert" className="text-sm text-state-warning">El mapa no está configurado. Ingresá las coordenadas manualmente.</p>
  return <APIProvider apiKey={apiKey}><PickerCanvas {...props} /></APIProvider>
}
