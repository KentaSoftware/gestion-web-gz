import { PageContainer, PageHeader, PageSection } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCaption, TableCell, TableRow } from '@/components/ui/table'

const STAGE_NUMBER = 'font-mono text-caption text-text-muted'

/**
 * Simulation scenarios page shell (SIM-06, Plan Phase A, S-01).
 *
 * Presentation-only: renders the configuration, primary-action and
 * history/comparison regions with empty states. It performs no calculation,
 * network request or persistence, and deliberately omits live controls until
 * the module is available.
 */
export default function SimulationPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Simulación de escenarios"
        description="Vista de presentación con la estructura prevista para configurar, ejecutar y comparar escenarios."
      />

      <div
        role="note"
        className="mb-6 rounded-md border border-border-subtle bg-background-subtle px-4 py-3"
      >
        <p className="text-label font-semibold text-text-primary">Solo presentación</p>
        <p className="mt-1 text-label text-text-secondary">
          La simulación todavía no está disponible. Esta pantalla no calcula, no guarda datos y no
          ejecuta acciones.
        </p>
      </div>

      <PageSection>
        <div className="rounded-lg border border-border-subtle bg-surface-base">
          <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-border-subtle px-5 py-4">
            <span aria-hidden="true" className={STAGE_NUMBER}>
              01
            </span>
            <div>
              <h2 className="text-subheading font-bold text-text-primary">
                Configuración del escenario
              </h2>
              <p className="text-label text-text-secondary">Punto de partida del escenario.</p>
            </div>
          </header>
          <div className="px-5 py-8">
            <p className="text-label font-semibold text-text-primary">Sin configuración cargada</p>
            <p className="mt-1 max-w-prose text-label text-text-secondary">
              Los controles de configuración se incorporarán cuando el módulo esté disponible.
            </p>
          </div>
        </div>
      </PageSection>

      <PageSection>
        <div className="flex flex-col gap-5 rounded-lg border border-border-strong bg-background-subtle px-5 py-5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span aria-hidden="true" className={STAGE_NUMBER}>
              02
            </span>
            <div>
              <h2 className="text-subheading font-bold text-text-primary">Ejecutar simulación</h2>
              <p className="text-label text-text-secondary">Etapa de la acción principal.</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            <Button type="button" disabled aria-describedby="simulation-action-status">
              Ejecutar simulación
            </Button>
            <p id="simulation-action-status" className="text-caption text-text-muted">
              Acción no disponible en esta versión.
            </p>
          </div>
        </div>
      </PageSection>

      <PageSection>
        <div className="rounded-lg border border-border-subtle bg-surface-base">
          <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-border-subtle px-5 py-4">
            <span aria-hidden="true" className={STAGE_NUMBER}>
              03
            </span>
            <div>
              <h2 className="text-subheading font-bold text-text-primary">
                Historial y comparación
              </h2>
              <p className="text-label text-text-secondary">Revisión de simulaciones anteriores.</p>
            </div>
          </header>
          <Table>
            <TableCaption className="sr-only">Historial de simulaciones</TableCaption>
            <TableBody>
              <TableRow className="hover:bg-transparent">
                <TableCell className="px-5 py-10">
                  <p className="text-label font-semibold text-text-primary">
                    Todavía no hay simulaciones registradas.
                  </p>
                  <p className="mt-1 max-w-prose text-label text-text-secondary">
                    El historial y la comparación se habilitarán cuando el módulo esté disponible.
                  </p>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </PageSection>
    </PageContainer>
  )
}
