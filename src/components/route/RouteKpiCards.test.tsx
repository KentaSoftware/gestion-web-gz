import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RouteKpiCards } from './RouteKpiCards'

describe('RouteKpiCards', () => {
  it('renders the four route metrics with physical units', () => {
    render(
      <RouteKpiCards
        kpis={{
          activeRoutes: 2,
          pendingOrders: 12,
          totalDistanceMeters: 3456,
          estimatedFuelLiters: 78.25,
        }}
      />,
    )

    expect(screen.getByText('Rutas activas')).toBeInTheDocument()
    expect(screen.getByText('Pedidos pendientes')).toBeInTheDocument()
    expect(screen.getByText('Distancia total')).toBeInTheDocument()
    expect(screen.getByText('Costo combustible est.')).toBeInTheDocument()
    expect(screen.getByLabelText('Rutas activas: 2')).toBeInTheDocument()
    expect(screen.getByLabelText('Pedidos pendientes: 12')).toBeInTheDocument()
    expect(screen.getByLabelText('Distancia total: 3,5 km')).toBeInTheDocument()
    expect(screen.getByLabelText('Costo combustible est.: No disponible')).toBeInTheDocument()
    expect(screen.getByText('Consumo estimado: 78,25 L')).toBeInTheDocument()
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument()
  })

  it('does not imply a fuel cost or consumption when liters are unavailable', () => {
    render(<RouteKpiCards kpis={{ activeRoutes: 0, pendingOrders: 0, totalDistanceMeters: null, estimatedFuelLiters: null }} />)

    expect(screen.getByLabelText('Costo combustible est.: No disponible')).toBeInTheDocument()
    expect(screen.getByText('Consumo estimado: No disponible')).toBeInTheDocument()
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument()
  })
})
