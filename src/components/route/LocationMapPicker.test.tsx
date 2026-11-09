import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocationMapPicker } from './LocationMapPicker'

vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  APILoadingStatus: { LOADED: 'loaded', FAILED: 'failed', AUTH_FAILURE: 'auth' },
  useApiLoadingStatus: () => 'loaded',
  Map: ({ children, onClick }: { children: React.ReactNode; onClick: (event: unknown) => void }) => <div><button onClick={() => onClick({ detail: { latLng: { lat: 1, lng: 2 } } })}>map click</button>{children}</div>,
  Marker: ({ onDragEnd }: { onDragEnd: (event: unknown) => void }) => <button onClick={() => onDragEnd({ latLng: { toJSON: () => ({ lat: 3, lng: 4 }) } })}>marker drag</button>,
  useMap: () => null,
}))

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('LocationMapPicker', () => {
  it.each(['map click', 'marker drag', 'prop change'])('ignores a delayed search after %s', async (choice) => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'test-key')
    let resolveSearch: (value: unknown) => void = () => {}
    const geocode = vi.fn().mockReturnValue(new Promise((resolve) => { resolveSearch = resolve }))
    vi.stubGlobal('google', { maps: { SymbolPath: { CIRCLE: 0 }, Geocoder: class { geocode = geocode } } })
    const onChange = vi.fn()
    const { rerender } = render(<LocationMapPicker value={{ lat: 0, lng: 0 }} onChange={onChange} kind="origin" address="Calle 1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Buscar dirección del depósito' }))
    if (choice === 'prop change') rerender(<LocationMapPicker value={{ lat: 5, lng: 6 }} onChange={onChange} kind="origin" address="Calle 1" />)
    else fireEvent.click(screen.getByText(choice))
    await act(async () => { resolveSearch({ results: [{ geometry: { location: { lat: () => 8, lng: () => 9 } } }] }) })
    expect(onChange).not.toHaveBeenCalledWith({ lat: 8, lng: 9 })
    expect(screen.getByRole('button', { name: 'Buscar dirección del depósito' })).toBeEnabled()
  })
  it('emits coordinates for map click and marker drag', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'test-key')
    vi.stubGlobal('google', { maps: { SymbolPath: { CIRCLE: 0 } } })
    const onChange = vi.fn()
    render(<LocationMapPicker value={{ lat: 0, lng: 0 }} onChange={onChange} kind="origin" />)
    fireEvent.click(screen.getByText('map click'))
    fireEvent.click(screen.getByText('marker drag'))
    expect(onChange).toHaveBeenNthCalledWith(1, { lat: 1, lng: 2 })
    expect(onChange).toHaveBeenNthCalledWith(2, { lat: 3, lng: 4 })
  })

  it('shows a manual fallback without a key', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', '')
    render(<LocationMapPicker value={null} onChange={vi.fn()} kind="client" />)
    expect(screen.getByRole('alert')).toHaveTextContent(/manualmente/i)
  })

  it('retains manual fallback when an explicit origin search fails', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'test-key')
    const geocode = vi.fn().mockRejectedValue(new Error('quota'))
    vi.stubGlobal('google', { maps: { SymbolPath: { CIRCLE: 0 }, Geocoder: class { geocode = geocode } } })
    render(<LocationMapPicker value={{ lat: 0, lng: 0 }} onChange={vi.fn()} kind="origin" address="Calle 1" />)
    expect(geocode).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Buscar dirección del depósito' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('manualmente')
    expect(geocode).toHaveBeenCalledTimes(1)
  })
})
