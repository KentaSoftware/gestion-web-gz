import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import SimulationPage from './page'

const MAIN_REGION_HEADINGS = [
  'Parámetros de simulación',
  'Ejecutar simulación',
  'Registros de escenarios',
]

const REVIEW_HEADING = 'Estados de revisión'
const COMPOSED_COLLAPSED = 'Configuración contraída con historial de muestra'
const COMPOSED_COLLAPSED_UNSELECTED = 'Configuración contraída con historial sin selección'
const COMPOSED_EMPTY_ROUTE = 'Ruta vacía con historial de muestra'
const EMPTY_HISTORY = 'Historial sin registros'

const regionFor = (name: string): HTMLElement => {
  const heading = screen.getByRole('heading', { level: 2, name })
  const region = heading.closest('section')
  expect(region).not.toBeNull()
  return region as HTMLElement
}

const specimenFor = (name: string): HTMLElement => {
  const heading = screen.getByRole('heading', { level: 3, name })
  const specimen = heading.closest('article')
  expect(specimen).not.toBeNull()
  return specimen as HTMLElement
}

const selectedRows = (table: HTMLElement): HTMLElement[] =>
  within(table)
    .getAllByRole('row')
    .filter((row) => row.getAttribute('data-state') === 'selected')

const unselectedRows = (table: HTMLElement): HTMLElement[] =>
  within(table)
    .getAllByRole('row')
    .filter((row) => row.getAttribute('data-state') === 'unselected')

describe('SimulationPage illustrative presentation specimens (structural assertions only)', () => {
  it('S-01 renders the dashboard frame and three main zones in reading order', () => {
    render(<SimulationPage />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Simulación de escenarios' }),
    ).toBeInTheDocument()

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual([...MAIN_REGION_HEADINGS, REVIEW_HEADING])

    for (const name of MAIN_REGION_HEADINGS) {
      expect(regionFor(name)).toBeInTheDocument()
    }

    expect(
      within(regionFor('Parámetros de simulación')).getByText('Datos de muestra'),
    ).toBeInTheDocument()
    expect(within(regionFor('Ejecutar simulación')).getByText('Datos de muestra')).toBeInTheDocument()
    expect(
      within(regionFor('Registros de escenarios')).getByText('Datos de muestra'),
    ).toBeInTheDocument()
  })

  it('S-02 renders expanded-configuration content structurally', () => {
    render(<SimulationPage />)

    const configuration = regionFor('Parámetros de simulación')

    expect(
      within(configuration).getByRole('heading', { level: 3, name: 'Rutas a simular' }),
    ).toBeInTheDocument()
    expect(
      within(configuration).getByRole('heading', {
        level: 3,
        name: 'Productos para venta ambulante',
      }),
    ).toBeInTheDocument()
    expect(
      within(configuration).getByRole('heading', {
        level: 3,
        name: 'Parámetros del escenario',
      }),
    ).toBeInTheDocument()

    const routes = within(configuration).getByRole('table', { name: 'Rutas de muestra' })
    expect(within(routes).getAllByRole('row')).toHaveLength(4)
    expect(within(routes).getByText('R-001')).toBeInTheDocument()
    expect(within(configuration).getByText('3 rutas de muestra')).toBeInTheDocument()

    expect(
      within(configuration).getByRole('heading', { level: 4, name: 'Productos disponibles' }),
    ).toBeInTheDocument()
    expect(
      within(configuration).getByRole('heading', {
        level: 4,
        name: 'Productos incluidos en el vehículo',
      }),
    ).toBeInTheDocument()
    expect(within(configuration).getAllByText('Agua 500 ml')).toHaveLength(2)
    expect(within(configuration).getByText('Incluir excedentes')).toBeInTheDocument()
    expect(within(configuration).getByText('3 productos de muestra')).toBeInTheDocument()
  })

  it('S-01 renders exactly one full-width prominent action in the main composition', () => {
    render(<SimulationPage />)

    const actionRegion = regionFor('Ejecutar simulación')
    const actionVariants = actionRegion.querySelectorAll('[data-variant]')

    expect(actionVariants).toHaveLength(1)
    expect(actionVariants[0]).toHaveAttribute('data-variant', 'prominent')
    expect(actionVariants[0]).toHaveAttribute('data-layout', 'full-width')
    expect(within(actionRegion).getByText('Simular escenario')).toBeInTheDocument()
    expect(within(actionRegion).queryByText(/variante atenuada/i)).not.toBeInTheDocument()

    const review = regionFor(REVIEW_HEADING)
    expect(
      within(review).getByText('Simular escenario (variante atenuada)'),
    ).toHaveAttribute('data-variant', 'muted')
  })

  it('S-03/S-12 renders the composed collapsed-configuration and one-selected specimen structurally', () => {
    render(<SimulationPage />)

    const composed = specimenFor(COMPOSED_COLLAPSED)

    expect(within(composed).getByText('Mostrar configuración')).toBeInTheDocument()
    expect(within(composed).getByText(/Contenido plegado \(ilustrativo\)\./)).toBeInTheDocument()
    expect(within(composed).queryByRole('button')).not.toBeInTheDocument()

    const history = within(composed).getByRole('table', {
      name: 'Historial con una selección de muestra',
    })

    expect(selectedRows(history)).toHaveLength(1)
    expect(unselectedRows(history)).toHaveLength(2)
    expect(within(composed).getByText('1 seleccionada')).toBeInTheDocument()
    expect(within(composed).getByText('Comparar escenarios')).toHaveAttribute(
      'data-variant',
      'prominent',
    )
  })

  it('S-03 renders collapsed configuration with populated unselected history in one specimen', () => {
    render(<SimulationPage />)

    const composed = specimenFor(COMPOSED_COLLAPSED_UNSELECTED)

    expect(within(composed).getByText('Mostrar configuración')).toBeInTheDocument()
    expect(within(composed).getByText(/Contenido plegado \(ilustrativo\)\./)).toBeInTheDocument()
    expect(within(composed).queryByRole('button')).not.toBeInTheDocument()

    const history = within(composed).getByRole('table', {
      name: 'Historial poblado sin selección de muestra',
    })

    expect(within(history).getAllByRole('row')).toHaveLength(3)
    expect(selectedRows(history)).toHaveLength(0)
    expect(unselectedRows(history)).toHaveLength(2)
    expect(within(history).getByText('ESC-010')).toBeInTheDocument()
    expect(within(history).getByText('ESC-009')).toBeInTheDocument()
    expect(within(composed).getByText('Ninguna marcada')).toBeInTheDocument()
    expect(within(composed).getByText('2 filas de muestra')).toBeInTheDocument()
    expect(within(composed).getByText('Comparar escenarios')).toHaveAttribute(
      'data-variant',
      'muted',
    )
  })

  it('S-10 renders the composed empty-route and none-selected specimen structurally', () => {
    render(<SimulationPage />)

    const composed = specimenFor(COMPOSED_EMPTY_ROUTE)

    expect(within(composed).getByText('No hay rutas disponibles.')).toBeInTheDocument()
    expect(
      within(composed).getByText('Estado vacío de la región de rutas, solo para revisión visual.'),
    ).toBeInTheDocument()

    const history = within(composed).getByRole('table', {
      name: 'Historial sin selección de muestra',
    })

    expect(selectedRows(history)).toHaveLength(0)
    expect(unselectedRows(history)).toHaveLength(2)
    expect(within(composed).getByText('0 seleccionadas')).toBeInTheDocument()
    expect(
      within(composed).getByText('Simular escenario (variante atenuada)'),
    ).toHaveAttribute('data-variant', 'muted')
    expect(within(composed).getByText('Comparar escenarios')).toHaveAttribute(
      'data-variant',
      'muted',
    )
  })

  it('S-11 renders the empty-history specimen structurally, distinct from populated history', () => {
    render(<SimulationPage />)

    const populated = within(regionFor('Registros de escenarios')).getByRole('table', {
      name: 'Registros de escenarios de muestra',
    })
    expect(within(populated).getAllByRole('row')).toHaveLength(5)
    expect(within(populated).getByText('ESC-014')).toBeInTheDocument()

    const emptyHistory = specimenFor(EMPTY_HISTORY)
    const emptyTable = within(emptyHistory).getByRole('table', {
      name: 'Historial vacío de muestra',
    })

    expect(within(emptyTable).getByText('No hay escenarios registrados.')).toBeInTheDocument()
    expect(within(emptyTable).getAllByRole('row')).toHaveLength(2)
    expect(within(emptyTable).queryByText('ESC-014')).not.toBeInTheDocument()
  })

  it('S-12 renders distinct zero-, one- and two-selection history representations', () => {
    render(<SimulationPage />)

    const mainHistory = within(regionFor('Registros de escenarios')).getByRole('table', {
      name: 'Registros de escenarios de muestra',
    })
    expect(selectedRows(mainHistory)).toHaveLength(2)
    expect(unselectedRows(mainHistory)).toHaveLength(2)

    const oneSelected = within(specimenFor(COMPOSED_COLLAPSED)).getByRole('table', {
      name: 'Historial con una selección de muestra',
    })
    expect(selectedRows(oneSelected)).toHaveLength(1)
    expect(unselectedRows(oneSelected)).toHaveLength(2)

    const noneSelected = within(specimenFor(COMPOSED_EMPTY_ROUTE)).getByRole('table', {
      name: 'Historial sin selección de muestra',
    })
    expect(selectedRows(noneSelected)).toHaveLength(0)
    expect(unselectedRows(noneSelected)).toHaveLength(2)
  })

  it('S-20 labels sample history without completed-or-saved claims', () => {
    render(<SimulationPage />)

    const history = regionFor('Registros de escenarios')

    expect(within(history).getByText('Historial de escenarios de muestra.')).toBeInTheDocument()
    expect(within(history).queryByText(/realizadas y guardadas/i)).not.toBeInTheDocument()
    expect(within(history).queryByText(/simulaciones realizadas/i)).not.toBeInTheDocument()
  })

  it('S-20 keeps record counts internally consistent and omits pagination controls', () => {
    render(<SimulationPage />)

    expect(screen.queryByText('Anterior')).not.toBeInTheDocument()
    expect(screen.queryByText('Siguiente')).not.toBeInTheDocument()
    expect(screen.queryByText(/Mostrando 1 a/)).not.toBeInTheDocument()

    expect(screen.getByText('4 registros de muestra')).toBeInTheDocument()
    expect(screen.getByText('2 seleccionadas')).toBeInTheDocument()
    expect(screen.getByText('3 registros de muestra')).toBeInTheDocument()
    expect(screen.getByText('1 seleccionada')).toBeInTheDocument()
    expect(screen.getByText('2 registros de muestra')).toBeInTheDocument()
    expect(screen.getByText('0 seleccionadas')).toBeInTheDocument()
    expect(screen.getByText('0 registros de muestra')).toBeInTheDocument()
  })

  it('S-20 marks displayed content as illustrative specimens, not approved or real', () => {
    render(<SimulationPage />)

    const notice = screen.getByRole('note')
    expect(notice).toHaveTextContent('Vista ilustrativa')
    expect(notice).toHaveTextContent(/especímenes de revisión/i)
    expect(notice).toHaveTextContent(/no representan una pantalla aprobada ni datos reales/i)
    expect(notice).toHaveTextContent(/no ejecuta simulaciones, no calcula, no consulta servicios/i)
    expect(notice).toHaveTextContent(/no guarda datos/i)

    expect(screen.getAllByText('Datos de muestra').length).toBeGreaterThanOrEqual(3)

    expect(
      within(regionFor(REVIEW_HEADING)).getByText(
        'Variantes de presentación ilustrativas. No son estados aprobados ni comportamientos del producto.',
      ),
    ).toBeInTheDocument()

    expect(
      screen.getAllByText('Espécimen de revisión').length,
    ).toBeGreaterThanOrEqual(2)
  })

  it('S-20 introduces no behavior, service call, calculation or persistence', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    render(<SimulationPage />)

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(screen.queryAllByRole('combobox')).toHaveLength(0)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(document.querySelector('form')).toBeNull()
    expect(document.querySelector('details')).toBeNull()
    expect(document.querySelector('input, select, textarea')).toBeNull()

    vi.unstubAllGlobals()
  })
})
