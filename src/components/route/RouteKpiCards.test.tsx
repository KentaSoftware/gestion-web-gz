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
    expect(screen.getByText('Combustible estimado')).toBeInTheDocument()
    expect(screen.getByLabelText('Rutas activas: 2')).toBeInTheDocument()
    expect(screen.getByLabelText('Pedidos pendientes: 12')).toBeInTheDocument()
    expect(screen.getByLabelText('Distancia total: 3,5 km')).toBeInTheDocument()
    expect(screen.getByLabelText('Combustible estimado: 78,25 L')).toBeInTheDocument()
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument()
  })
})
