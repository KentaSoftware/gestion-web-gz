import type { ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Info,
  ListChecks,
  MapPin,
  Play,
  Scale,
  SlidersHorizontal,
} from 'lucide-react'

import { PageContainer, PageHeader, PageSection } from '@/components/layout/PageLayout'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const STAGE_NUMBER = 'font-mono text-caption text-text-muted'
const SAMPLE_CHIP =
  'rounded-full border border-border-subtle bg-background-subtle px-2.5 py-1 text-caption font-medium text-text-secondary'
const PANEL_HEADER =
  'flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-5 py-4'
const TABLE_HEAD =
  'h-9 px-3 py-2 text-caption font-semibold uppercase tracking-wide text-text-secondary'
const TABLE_CELL = 'px-3 py-2.5 text-label text-text-secondary'
const CHECKBOX_BASE = 'inline-flex size-4 items-center justify-center rounded-sm border'
const RADIO_BASE = 'inline-flex size-4 items-center justify-center rounded-full border'

const ROUTE_ROWS = [
  {
    id: 'R-001',
    zone: 'Norte',
    orders: 12,
    driver: 'Juan Pérez',
    vehicle: 'Móvil 1',
    distance: '102,4 km',
    selected: true,
  },
  {
    id: 'R-002',
    zone: 'Centro',
    orders: 10,
    driver: 'María López',
    vehicle: 'Móvil 2',
    distance: '85,6 km',
    selected: false,
  },
  {
    id: 'R-003',
    zone: 'Sur',
    orders: 8,
    driver: 'Carlos Ruiz',
    vehicle: 'Móvil 3',
    distance: '78,3 km',
    selected: false,
  },
] as const

const AVAILABLE_PRODUCTS = [
  { name: 'Agua 500 ml', stock: 120, price: '1.200' },
  { name: 'Gaseosa 1.5 L', stock: 90, price: '2.500' },
  { name: 'Jugo 1 L', stock: 75, price: '1.800' },
] as const

const LOADED_PRODUCTS = [
  { name: 'Agua 500 ml', quantity: 40, price: '1.200' },
  { name: 'Gaseosa 1.5 L', quantity: 30, price: '2.500' },
  { name: 'Jugo 1 L', quantity: 20, price: '1.800' },
] as const

const PARAMETERS = [
  { label: 'Precio combustible ($/L)', value: '1.250' },
  { label: 'Gastos varios ($)', value: '25.000' },
  { label: 'Costo por hora ($)', value: '8.000' },
] as const

const HISTORY_ROWS = [
  {
    id: 'ESC-014',
    date: '26/05/2025',
    route: 'R-001',
    zone: 'Norte',
    driver: 'Juan Pérez',
    vehicle: 'Móvil 1',
    income: '$ 485.000',
    cost: '$ 125.000',
    margin: '$ 360.000',
    selected: true,
  },
  {
    id: 'ESC-013',
    date: '25/05/2025',
    route: 'R-004',
    zone: 'Este',
    driver: 'Ana Torres',
    vehicle: 'Móvil 1',
    income: '$ 620.000',
    cost: '$ 168.000',
    margin: '$ 452.000',
    selected: false,
  },
  {
    id: 'ESC-012',
    date: '24/05/2025',
    route: 'R-002',
    zone: 'Centro',
    driver: 'María López',
    vehicle: 'Móvil 2',
    income: '$ 398.000',
    cost: '$ 112.000',
    margin: '$ 286.000',
    selected: true,
  },
  {
    id: 'ESC-011',
    date: '23/05/2025',
    route: 'R-003',
    zone: 'Sur',
    driver: 'Carlos Ruiz',
    vehicle: 'Móvil 3',
    income: '$ 355.000',
    cost: '$ 110.000',
    margin: '$ 245.000',
    selected: false,
  },
] as const

const ONE_SELECTED_ROWS = [
  { id: 'ESC-014', date: '26/05/2025', route: 'R-001', margin: '$ 360.000', selected: true },
  { id: 'ESC-013', date: '25/05/2025', route: 'R-004', margin: '$ 452.000', selected: false },
  { id: 'ESC-011', date: '23/05/2025', route: 'R-003', margin: '$ 245.000', selected: false },
] as const

const NONE_SELECTED_ROWS = [
  { id: 'ESC-010', date: '22/05/2025', route: 'R-005', margin: '$ 282.000', selected: false },
  { id: 'ESC-009', date: '21/05/2025', route: 'R-001', margin: '$ 342.000', selected: false },
] as const

interface StageHeaderProps {
  number: string
  title: string
  description: string
  icon: ReactNode
  affordance?: ReactNode
}

function StageHeader({ number, title, description, icon, affordance }: StageHeaderProps) {
  return (
    <header className={PANEL_HEADER}>
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-9 items-center justify-center rounded-md bg-background-subtle text-brand-primary"
        >
          {icon}
        </span>
        <div className="flex items-baseline gap-3">
          <span aria-hidden="true" className={STAGE_NUMBER}>
            {number}
          </span>
          <div>
            <h2 className="text-subheading font-bold text-text-primary">{title}</h2>
            <p className="text-label text-text-secondary">{description}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={SAMPLE_CHIP}>Datos de muestra</span>
        {affordance}
      </div>
    </header>
  )
}

interface SelectionMarkProps {
  selected: boolean
  shape: 'checkbox' | 'radio'
}

function SelectionMark({ selected, shape }: SelectionMarkProps) {
  if (shape === 'radio') {
    return (
      <span
        aria-hidden="true"
        className={`${RADIO_BASE} ${selected ? 'border-brand-primary' : 'border-border-strong'}`}
      >
        {selected ? <span className="size-2 rounded-full bg-brand-primary" /> : null}
      </span>
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`${CHECKBOX_BASE} ${
        selected
          ? 'border-brand-primary bg-brand-primary text-text-inverse'
          : 'border-border-strong bg-surface-base'
      }`}
    >
      {selected ? <Check className="size-3" /> : null}
    </span>
  )
}

/**
 * Simulation scenarios visual dashboard (presentation only).
 *
 * Renders illustrative review states for configuration, the primary action and
 * history/comparison. Every value is sample content: no simulation is executed,
 * no result is calculated, no service is queried and nothing is persisted.
 */
export default function SimulationPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Simulación de escenarios"
        description="Vista de presentación para revisar la configuración, la acción principal y el historial de escenarios."
      />

      <div
        role="note"
        className="mb-6 rounded-md border border-border-subtle bg-background-subtle px-4 py-3"
      >
        <p className="text-label font-semibold text-text-primary">Vista ilustrativa</p>
        <p className="mt-1 max-w-prose text-label text-text-secondary">
          Composición provisional de muestra para revisar la dirección visual. Los valores,
          selecciones y combinaciones son especímenes de revisión: no representan una pantalla
          aprobada ni datos reales. Esta vista no ejecuta simulaciones, no calcula, no consulta
          servicios y no guarda datos.
        </p>
      </div>

      <PageSection>
        <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface-base shadow-sm">
          <StageHeader
            number="01"
            title="Parámetros de simulación"
            description="Ruta, productos y costos del escenario."
            icon={<SlidersHorizontal className="size-5" />}
            affordance={
              <span
                aria-hidden="true"
                className="inline-flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1 text-caption text-text-secondary"
              >
                <ChevronUp className="size-3.5" />
                Contraer
              </span>
            }
          />

          <div className="px-5 py-5">
            <div className="grid grid-cols-[minmax(0,1fr)_17rem] gap-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h3 className="text-label font-bold text-text-primary">Rutas a simular</h3>
                    <p className="text-caption text-text-secondary">
                      Selección visual de muestra; la primera fila se muestra marcada.
                    </p>
                  </div>
                  <span className="text-caption text-text-muted">3 rutas de muestra</span>
                </div>

                <div className="mt-3">
                  <Table aria-label="Rutas de muestra">
                    <TableHeader>
                      <TableRow className="bg-background-subtle hover:bg-background-subtle">
                        <TableHead className={`${TABLE_HEAD} w-8`}>
                          <span className="sr-only">Selección de muestra</span>
                        </TableHead>
                        <TableHead className={TABLE_HEAD}>Ruta</TableHead>
                        <TableHead className={TABLE_HEAD}>Zona</TableHead>
                        <TableHead className={TABLE_HEAD}>Pedidos</TableHead>
                        <TableHead className={TABLE_HEAD}>Repartidor</TableHead>
                        <TableHead className={TABLE_HEAD}>Vehículo</TableHead>
                        <TableHead className={TABLE_HEAD}>Distancia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ROUTE_ROWS.map((route) => (
                        <TableRow
                          key={route.id}
                          data-state={route.selected ? 'selected' : 'unselected'}
                          className={
                            route.selected
                              ? 'bg-brand-primary/5 hover:bg-brand-primary/5'
                              : 'hover:bg-transparent'
                          }
                        >
                          <TableCell className="px-3 py-2.5">
                            <SelectionMark selected={route.selected} shape="radio" />
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-label font-semibold text-text-primary">
                            {route.id}
                          </TableCell>
                          <TableCell className={TABLE_CELL}>{route.zone}</TableCell>
                          <TableCell className={TABLE_CELL}>{route.orders}</TableCell>
                          <TableCell className={TABLE_CELL}>{route.driver}</TableCell>
                          <TableCell className={TABLE_CELL}>{route.vehicle}</TableCell>
                          <TableCell className={TABLE_CELL}>{route.distance}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="mt-2 text-caption text-text-muted">
                  Los valores y la selección son de muestra.
                </p>
              </div>

              <aside className="min-w-0 rounded-md border border-border-subtle bg-background-subtle p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-label font-bold text-text-primary">
                    Parámetros del escenario
                  </h3>
                  <Info className="size-3.5 text-text-muted" aria-hidden="true" />
                </div>
                <p className="mt-1 text-caption text-text-secondary">
                  Valores de referencia, no editables en esta vista.
                </p>

                <dl className="mt-4 space-y-3">
                  {PARAMETERS.map((parameter) => (
                    <div key={parameter.label}>
                      <dt className="text-caption font-medium text-text-secondary">
                        {parameter.label}
                      </dt>
                      <dd className="mt-1 rounded-md border border-border-subtle bg-surface-base px-3 py-2 text-label text-text-primary">
                        {parameter.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-caption font-medium text-text-secondary">
                    Incluir excedentes
                  </span>
                  <span
                    aria-hidden="true"
                    className="inline-flex h-5 w-9 items-center rounded-full bg-brand-primary p-0.5"
                  >
                    <span className="ml-auto size-4 rounded-full bg-surface-base" />
                  </span>
                </div>
                <p className="mt-4 border-t border-border-subtle pt-3 text-caption text-text-muted">
                  Selección y valores ilustrativos. No definen reglas del escenario.
                </p>
              </aside>
            </div>

            <div className="mt-6 border-t border-border-subtle pt-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h3 className="text-label font-bold text-text-primary">
                    Productos para venta ambulante
                  </h3>
                  <p className="text-caption text-text-secondary">
                    Composición de muestra entre productos disponibles y cargados.
                  </p>
                </div>
                <span className="text-caption text-text-muted">3 productos de muestra</span>
              </div>

              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_2.25rem_minmax(0,1fr)] items-start gap-3">
                <div className="min-w-0 overflow-hidden rounded-md border border-border-subtle">
                  <div className="border-b border-border-subtle bg-background-subtle px-3 py-2">
                    <h4 className="text-label font-semibold text-text-primary">
                      Productos disponibles
                    </h4>
                    <p className="text-caption text-text-muted">Stock y precio de muestra.</p>
                  </div>
                  <Table aria-label="Productos disponibles de muestra">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className={TABLE_HEAD}>Producto</TableHead>
                        <TableHead className={TABLE_HEAD}>Stock</TableHead>
                        <TableHead className={TABLE_HEAD}>Precio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {AVAILABLE_PRODUCTS.map((product) => (
                        <TableRow key={product.name} className="hover:bg-transparent">
                          <TableCell className="px-3 py-2.5 text-label text-text-primary">
                            {product.name}
                          </TableCell>
                          <TableCell className={TABLE_CELL}>{product.stock}</TableCell>
                          <TableCell className={TABLE_CELL}>$ {product.price}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div
                  aria-hidden="true"
                  className="flex flex-col items-center gap-2 pt-11 text-text-muted"
                >
                  <span className="flex size-8 items-center justify-center rounded-md border border-border-subtle bg-background-subtle">
                    <ArrowRight className="size-4" />
                  </span>
                  <span className="flex size-8 items-center justify-center rounded-md border border-border-subtle bg-background-subtle">
                    <ArrowLeft className="size-4" />
                  </span>
                </div>

                <div className="min-w-0 overflow-hidden rounded-md border border-border-subtle">
                  <div className="border-b border-border-subtle bg-background-subtle px-3 py-2">
                    <h4 className="text-label font-semibold text-text-primary">
                      Productos incluidos en el vehículo
                    </h4>
                    <p className="text-caption text-text-muted">Cantidades de muestra.</p>
                  </div>
                  <Table aria-label="Productos incluidos en el vehículo de muestra">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className={TABLE_HEAD}>Producto</TableHead>
                        <TableHead className={TABLE_HEAD}>Cantidad</TableHead>
                        <TableHead className={TABLE_HEAD}>Precio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {LOADED_PRODUCTS.map((product) => (
                        <TableRow key={product.name} className="hover:bg-transparent">
                          <TableCell className="px-3 py-2.5 text-label text-text-primary">
                            {product.name}
                          </TableCell>
                          <TableCell className={TABLE_CELL}>{product.quantity}</TableCell>
                          <TableCell className={TABLE_CELL}>$ {product.price}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageSection>

      <PageSection>
        <div className="overflow-hidden rounded-lg border border-border-strong bg-surface-base">
          <StageHeader
            number="02"
            title="Ejecutar simulación"
            description="Acción principal del escenario, presentada como referencia visual."
            icon={<Play className="size-5" />}
          />

          <div className="px-5 py-5">
            <div
              data-variant="prominent"
              data-layout="full-width"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-primary px-6 py-4 text-body font-semibold text-text-inverse"
            >
              <Play className="size-5" aria-hidden="true" />
              Simular escenario
            </div>
            <p className="mt-2 text-caption text-text-secondary">
              Apariencia de referencia. No ejecuta la simulación ni define disponibilidad.
            </p>
          </div>
        </div>
      </PageSection>

      <PageSection>
        <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface-base shadow-sm">
          <StageHeader
            number="03"
            title="Registros de escenarios"
            description="Historial de escenarios de muestra."
            icon={<ListChecks className="size-5" />}
          />

          <div className="px-5 py-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-caption text-text-secondary">
                Dos filas marcadas y dos sin marcar como referencia visual.
              </p>
              <span className="text-caption text-text-muted">Historial de muestra</span>
            </div>

            <Table aria-label="Registros de escenarios de muestra">
              <TableHeader>
                <TableRow className="bg-background-subtle hover:bg-background-subtle">
                  <TableHead className={`${TABLE_HEAD} w-8`}>
                    <span className="sr-only">Selección de muestra</span>
                  </TableHead>
                  <TableHead className={TABLE_HEAD}>Escenario</TableHead>
                  <TableHead className={TABLE_HEAD}>Fecha</TableHead>
                  <TableHead className={TABLE_HEAD}>Ruta</TableHead>
                  <TableHead className={TABLE_HEAD}>Zona</TableHead>
                  <TableHead className={TABLE_HEAD}>Repartidor</TableHead>
                  <TableHead className={TABLE_HEAD}>Vehículo</TableHead>
                  <TableHead className={TABLE_HEAD}>Ingreso estimado</TableHead>
                  <TableHead className={TABLE_HEAD}>Costo operativo</TableHead>
                  <TableHead className={TABLE_HEAD}>Margen bruto</TableHead>
                  <TableHead className={TABLE_HEAD}>Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {HISTORY_ROWS.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.selected ? 'selected' : 'unselected'}
                    className={
                      row.selected
                        ? 'bg-brand-primary/5 hover:bg-brand-primary/5'
                        : 'hover:bg-transparent'
                    }
                  >
                    <TableCell className="px-3 py-2.5">
                      <SelectionMark selected={row.selected} shape="checkbox" />
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-label font-semibold text-text-primary">
                      {row.id}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-caption text-text-secondary">
                      {row.date}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-caption text-text-secondary">
                      {row.route}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-caption text-text-secondary">
                      {row.zone}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-caption text-text-secondary">
                      {row.driver}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-caption text-text-secondary">
                      {row.vehicle}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-caption text-text-primary">
                      {row.income}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-caption text-text-secondary">
                      {row.cost}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-caption text-text-primary">
                      {row.margin}
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1 text-caption font-medium text-brand-primary">
                        <Eye className="size-3" aria-hidden="true" />
                        Ver detalle
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-caption text-text-muted">4 registros de muestra</p>
                <span className="rounded-full bg-background-subtle px-2 py-0.5 text-caption font-medium text-text-secondary">
                  2 seleccionadas
                </span>
              </div>
              <span
                data-variant="prominent"
                className="inline-flex items-center gap-2 rounded-md bg-brand-primary px-3 py-2 text-caption font-semibold text-text-inverse"
              >
                <Scale className="size-3.5" aria-hidden="true" />
                Comparar escenarios
              </span>
            </div>

            <p className="mt-3 rounded-md bg-background-subtle px-3 py-2 text-caption text-text-secondary">
              La comparación se muestra prominente por la selección visual de muestra; no define
              elegibilidad ni reglas.
            </p>
          </div>
        </div>
      </PageSection>

      <PageSection>
        <div className="rounded-lg border border-dashed border-border-strong bg-background-subtle/60 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-subheading font-bold text-text-primary">Estados de revisión</h2>
              <p className="text-label text-text-secondary">
                Variantes de presentación ilustrativas. No son estados aprobados ni
                comportamientos del producto.
              </p>
            </div>
            <span className="text-caption text-text-muted">Revisión visual</span>
          </div>

          <div className="mt-4 space-y-4">
            <article className="rounded-md border border-border-subtle bg-surface-base p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-label font-bold text-text-primary">
                    Configuración contraída con historial de muestra
                  </h3>
                  <p className="mt-1 text-caption text-text-secondary">
                    Configuración plegada, historial poblado, una fila marcada y comparación
                    visible.
                  </p>
                </div>
                <span className={SAMPLE_CHIP}>Espécimen de revisión</span>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border-subtle bg-background-subtle/60 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="flex size-8 items-center justify-center rounded-md bg-surface-base text-brand-primary"
                  >
                    <SlidersHorizontal className="size-4" />
                  </span>
                  <div>
                    <p className="text-label font-semibold text-text-primary">
                      Parámetros de simulación
                    </p>
                    <p className="text-caption text-text-muted">Contenido plegado (ilustrativo).</p>
                  </div>
                </div>
                <span
                  aria-hidden="true"
                  className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-surface-base px-2 py-1 text-caption text-text-secondary"
                >
                  <ChevronDown className="size-3.5" />
                  Mostrar configuración
                </span>
              </div>

              <div className="mt-3 overflow-hidden rounded-md border border-border-subtle">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle bg-background-subtle px-3 py-2">
                  <h4 className="text-label font-semibold text-text-primary">
                    Historial de muestra
                  </h4>
                  <span className="text-caption text-text-muted">1 seleccionada</span>
                </div>
                <Table aria-label="Historial con una selección de muestra">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className={`${TABLE_HEAD} w-8`}>
                        <span className="sr-only">Selección de muestra</span>
                      </TableHead>
                      <TableHead className={TABLE_HEAD}>Escenario</TableHead>
                      <TableHead className={TABLE_HEAD}>Fecha</TableHead>
                      <TableHead className={TABLE_HEAD}>Ruta</TableHead>
                      <TableHead className={TABLE_HEAD}>Margen bruto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ONE_SELECTED_ROWS.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.selected ? 'selected' : 'unselected'}
                        className={
                          row.selected
                            ? 'bg-brand-primary/5 hover:bg-brand-primary/5'
                            : 'hover:bg-transparent'
                        }
                      >
                        <TableCell className="px-3 py-2.5">
                          <SelectionMark selected={row.selected} shape="checkbox" />
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-label font-semibold text-text-primary">
                          {row.id}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-caption text-text-secondary">
                          {row.date}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-caption text-text-secondary">
                          {row.route}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-caption text-text-primary">
                          {row.margin}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle px-3 py-2.5">
                  <span className="text-caption text-text-muted">3 registros de muestra</span>
                  <span
                    data-variant="prominent"
                    className="inline-flex items-center gap-1 rounded-md bg-brand-primary px-2 py-1 text-caption font-medium text-text-inverse"
                  >
                    <Scale className="size-3" aria-hidden="true" />
                    Comparar escenarios
                  </span>
                </div>
              </div>
            </article>

            <article className="rounded-md border border-border-subtle bg-surface-base p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-label font-bold text-text-primary">
                    Configuración contraída con historial sin selección
                  </h3>
                  <p className="mt-1 text-caption text-text-secondary">
                    Configuración plegada y historial poblado sin filas marcadas; comparación con
                    tratamiento atenuado.
                  </p>
                </div>
                <span className={SAMPLE_CHIP}>Espécimen de revisión</span>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border-subtle bg-background-subtle/60 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="flex size-8 items-center justify-center rounded-md bg-surface-base text-brand-primary"
                  >
                    <SlidersHorizontal className="size-4" />
                  </span>
                  <div>
                    <p className="text-label font-semibold text-text-primary">
                      Parámetros de simulación
                    </p>
                    <p className="text-caption text-text-muted">Contenido plegado (ilustrativo).</p>
                  </div>
                </div>
                <span
                  aria-hidden="true"
                  className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-surface-base px-2 py-1 text-caption text-text-secondary"
                >
                  <ChevronDown className="size-3.5" />
                  Mostrar configuración
                </span>
              </div>

              <div className="mt-3 overflow-hidden rounded-md border border-border-subtle">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle bg-background-subtle px-3 py-2">
                  <h4 className="text-label font-semibold text-text-primary">
                    Historial poblado sin filas marcadas
                  </h4>
                  <span className="text-caption text-text-muted">Ninguna marcada</span>
                </div>
                <Table aria-label="Historial poblado sin selección de muestra">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className={`${TABLE_HEAD} w-8`}>
                        <span className="sr-only">Selección de muestra</span>
                      </TableHead>
                      <TableHead className={TABLE_HEAD}>Escenario</TableHead>
                      <TableHead className={TABLE_HEAD}>Fecha</TableHead>
                      <TableHead className={TABLE_HEAD}>Ruta</TableHead>
                      <TableHead className={TABLE_HEAD}>Margen bruto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {NONE_SELECTED_ROWS.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state="unselected"
                        className="hover:bg-transparent"
                      >
                        <TableCell className="px-3 py-2.5">
                          <SelectionMark selected={false} shape="checkbox" />
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-label font-semibold text-text-primary">
                          {row.id}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-caption text-text-secondary">
                          {row.date}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-caption text-text-secondary">
                          {row.route}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-caption text-text-primary">
                          {row.margin}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle px-3 py-2.5">
                  <span className="text-caption text-text-muted">2 filas de muestra</span>
                  <span
                    data-variant="muted"
                    className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-background-subtle px-2 py-1 text-caption font-medium text-text-muted"
                  >
                    <Scale className="size-3" aria-hidden="true" />
                    Comparar escenarios
                  </span>
                </div>
              </div>
            </article>

            <article className="rounded-md border border-border-subtle bg-surface-base p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-label font-bold text-text-primary">
                    Ruta vacía con historial de muestra
                  </h3>
                  <p className="mt-1 text-caption text-text-secondary">
                    Sin rutas visibles, historial poblado sin selección y acción principal
                    atenuada.
                  </p>
                </div>
                <span className={SAMPLE_CHIP}>Espécimen de revisión</span>
              </div>

              <div className="mt-3 grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3">
                <div className="min-w-0 space-y-3">
                  <div className="overflow-hidden rounded-md border border-border-subtle">
                    <div className="border-b border-border-subtle bg-background-subtle px-3 py-2">
                      <h4 className="text-label font-semibold text-text-primary">
                        Ruta sin registros
                      </h4>
                    </div>
                    <Table aria-label="Rutas sin registros de muestra">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className={TABLE_HEAD}>Ruta</TableHead>
                          <TableHead className={TABLE_HEAD}>Zona</TableHead>
                          <TableHead className={TABLE_HEAD}>Pedidos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={3} className="px-3 py-7 text-center">
                            <MapPin className="mx-auto size-5 text-text-muted" aria-hidden="true" />
                            <p className="mt-2 text-label font-medium text-text-primary">
                              No hay rutas disponibles.
                            </p>
                            <p className="mt-1 text-caption text-text-secondary">
                              Estado vacío de la región de rutas, solo para revisión visual.
                            </p>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <div className="rounded-md border border-dashed border-border-strong bg-background-subtle p-3">
                    <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Acción atenuada
                    </p>
                    <div
                      data-variant="muted"
                      className="mt-2 flex items-center justify-center gap-2 rounded-md border border-border-subtle bg-surface-base px-4 py-3 text-label font-semibold text-text-muted"
                    >
                      <Play className="size-4" aria-hidden="true" />
                      Simular escenario (variante atenuada)
                    </div>
                    <p className="mt-2 text-caption text-text-secondary">
                      Solo referencia visual; no define disponibilidad ni reglas.
                    </p>
                  </div>
                </div>

                <div className="min-w-0 overflow-hidden rounded-md border border-border-subtle">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle bg-background-subtle px-3 py-2">
                    <h4 className="text-label font-semibold text-text-primary">
                      Historial sin selección
                    </h4>
                    <span className="text-caption text-text-muted">0 seleccionadas</span>
                  </div>
                  <Table aria-label="Historial sin selección de muestra">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className={`${TABLE_HEAD} w-8`}>
                          <span className="sr-only">Selección de muestra</span>
                        </TableHead>
                        <TableHead className={TABLE_HEAD}>Escenario</TableHead>
                        <TableHead className={TABLE_HEAD}>Fecha</TableHead>
                        <TableHead className={TABLE_HEAD}>Ruta</TableHead>
                        <TableHead className={TABLE_HEAD}>Margen bruto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {NONE_SELECTED_ROWS.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state="unselected"
                          className="hover:bg-transparent"
                        >
                          <TableCell className="px-3 py-2.5">
                            <SelectionMark selected={false} shape="checkbox" />
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-label font-semibold text-text-primary">
                            {row.id}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-caption text-text-secondary">
                            {row.date}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-caption text-text-secondary">
                            {row.route}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-caption text-text-primary">
                            {row.margin}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle px-3 py-2.5">
                    <span className="text-caption text-text-muted">2 registros de muestra</span>
                    <span
                      data-variant="muted"
                      className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-background-subtle px-2 py-1 text-caption font-medium text-text-muted"
                    >
                      <Scale className="size-3" aria-hidden="true" />
                      Comparar escenarios
                    </span>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-md border border-border-subtle bg-surface-base p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-label font-bold text-text-primary">Historial sin registros</h3>
                  <p className="mt-1 text-caption text-text-secondary">
                    Estado vacío dentro de la tabla, sin filas ni selección.
                  </p>
                </div>
                <span className={SAMPLE_CHIP}>Espécimen de revisión</span>
              </div>
              <div className="mt-3 overflow-hidden rounded-md border border-border-subtle">
                <Table aria-label="Historial vacío de muestra">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className={TABLE_HEAD}>Escenario</TableHead>
                      <TableHead className={TABLE_HEAD}>Fecha</TableHead>
                      <TableHead className={TABLE_HEAD}>Ruta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={3} className="px-3 py-7 text-center">
                        <FileText className="mx-auto size-5 text-text-muted" aria-hidden="true" />
                        <p className="mt-2 text-label font-medium text-text-primary">
                          No hay escenarios registrados.
                        </p>
                        <p className="mt-1 text-caption text-text-secondary">
                          El historial vacío se muestra dentro de la tabla.
                        </p>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-3">
                <span className="text-caption text-text-muted">0 registros de muestra</span>
                <span
                  data-variant="muted"
                  className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-background-subtle px-2 py-1 text-caption font-medium text-text-muted"
                >
                  <Scale className="size-3" aria-hidden="true" />
                  Comparar escenarios
                </span>
              </div>
            </article>
          </div>
        </div>
      </PageSection>
    </PageContainer>
  )
}
