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
    expect(screen.getByLabelText('Costo combustible est.: $ 97.812,50')).toBeInTheDocument()
    expect(screen.getByText('Consumo estimado: 78,25 L · Precio fijo: $ 1.250,00/L')).toBeInTheDocument()
  })

  it('uses unrounded liters for the cost', () => {
    render(<RouteKpiCards kpis={{ activeRoutes: 0, pendingOrders: 0, totalDistanceMeters: null, estimatedFuelLiters: 5.796235 }} />)

    expect(screen.getByLabelText('Costo combustible est.: $ 7.245,29')).toBeInTheDocument()
    expect(screen.getByText(/Consumo estimado: 5,8 L/)).toBeInTheDocument()
  })

  it('displays zero cost for zero liters', () => {
    render(<RouteKpiCards kpis={{ activeRoutes: 0, pendingOrders: 0, totalDistanceMeters: null, estimatedFuelLiters: 0 }} />)

    expect(screen.getByLabelText('Costo combustible est.: $ 0,00')).toBeInTheDocument()
  })

  it.each([null, NaN, Infinity, -1])('does not imply a fuel cost or consumption for invalid liters: %s', (liters) => {
    render(<RouteKpiCards kpis={{ activeRoutes: 0, pendingOrders: 0, totalDistanceMeters: null, estimatedFuelLiters: liters }} />)

    expect(screen.getByLabelText('Costo combustible est.: No disponible')).toBeInTheDocument()
    expect(screen.getByText(/Consumo estimado: No disponible/)).toBeInTheDocument()
  })
})
