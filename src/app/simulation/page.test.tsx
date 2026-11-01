import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import SimulationPage from './page'

const REGION_HEADINGS = [
  'Configuración del escenario',
  'Ejecutar simulación',
  'Historial y comparación',
]

describe('SimulationPage shell (S-01)', () => {
  it('renders the dashboard frame and the three regions in reading order', () => {
    render(<SimulationPage />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Simulación de escenarios' }),
    ).toBeInTheDocument()

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(REGION_HEADINGS)

    for (const name of REGION_HEADINGS) {
      expect(screen.getByRole('heading', { level: 2, name }).closest('section')).not.toBeNull()
    }
  })

  it('states that the screen is presentation only and not yet available', () => {
    render(<SimulationPage />)

    const notice = screen.getByRole('note')
    expect(notice).toHaveTextContent('Solo presentación')
    expect(notice).toHaveTextContent('todavía no está disponible')
    expect(notice).toHaveTextContent('no calcula, no guarda datos y no ejecuta acciones')
  })

  it('renders safe empty states and a disabled primary action without behavior claims', () => {
    render(<SimulationPage />)

    expect(screen.getByText('Sin configuración cargada')).toBeInTheDocument()
    expect(screen.getByText('Todavía no hay simulaciones registradas.')).toBeInTheDocument()

    const action = screen.getByRole('button', { name: 'Ejecutar simulación' })
    expect(action).toBeDisabled()
    expect(action).toHaveAccessibleDescription('Acción no disponible en esta versión.')

    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('keeps the history region table-oriented without fabricated records', () => {
    render(<SimulationPage />)

    const table = screen.getByRole('table', { name: 'Historial de simulaciones' })
    expect(table).toBeInTheDocument()
    expect(within(table).getAllByRole('row')).toHaveLength(1)
    expect(within(table).getByRole('cell')).toHaveTextContent(
      'Todavía no hay simulaciones registradas.',
    )
    expect(within(table).queryByRole('columnheader')).not.toBeInTheDocument()
  })
})
