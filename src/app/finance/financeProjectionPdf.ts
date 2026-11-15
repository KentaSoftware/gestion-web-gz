import { jsPDF } from 'jspdf'
import type { FinanceDashboard } from '@/interfaces/finance.interface'
import { projectFinance } from './financeProjection'

const money = (value: number) => `ARS ${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const date = (value: string) => value.split('-').reverse().join('/')

export function createProjectionPdf(dashboard: FinanceDashboard, exportedAt = new Date()) {
  const projection = projectFinance(dashboard, exportedAt)
  const pdf = new jsPDF()
  let y = 20
  const pendingHeadings: string[] = []
  const linesFor = (text: string, heading: boolean): string[] => {
    pdf.setFont('helvetica', heading ? 'bold' : 'normal')
    pdf.setFontSize(heading ? 13 : 10)
    return pdf.splitTextToSize(text, 174)
  }
  const draw = (text: string, heading: boolean) => {
    const lines = linesFor(text, heading)
    for (const line of lines) {
      if (y > 275) { pdf.addPage(); y = 20 }
      pdf.text(line, 18, y)
      y += heading ? 7 : 5
    }
    y += 3
  }
  const write = (text: string, heading = false) => {
    if (heading) {
      pendingHeadings.push(text)
      return
    }
    const headingHeight = pendingHeadings.reduce((height, item) => height + linesFor(item, true).length * 7 + 3, 0)
    if (pendingHeadings.length > 0 && y + headingHeight > 275) { pdf.addPage(); y = 20 }
    for (const item of pendingHeadings) draw(item, true)
    pendingHeadings.length = 0
    draw(text, false)
  }
  write('Proyección de caja a cuatro semanas', true)
  write('DATOS FICTICIOS · Escenario hipotético, no transacciones reales.', true)
  write(`Exportado: ${exportedAt.toLocaleString('es-AR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} UTC. Moneda: ARS.`)
  write(`Período histórico aplicado: ${date(dashboard.startDate)} al ${date(dashboard.endDate)} inclusive (${projection.days} días). Saldo ficticio al ${date(dashboard.endDate)}: ${money(projection.historicalBalance)}. Reserva de referencia: ${money(projection.reserve)}.`)
  write(`Fecha de referencia: ${date(projection.asOfDate)} (America/Argentina/Buenos_Aires). La proyección comienza el día siguiente.`)
  if (projection.bridgeDays > 0) {
    write(`Puente estimado de ${projection.bridgeDays} días desde el día posterior al saldo histórico hasta la fecha de referencia inclusive: ingresos ${money(projection.bridgeInflows)}, egresos ${money(projection.bridgeOutflows)}. Saldo inicial estimado: ${money(projection.opening)}; no es un saldo real ni observado hoy.`)
    write('El puente multiplica cada promedio diario histórico por los días transcurridos y redondea cada total a centavos. No representa movimientos registrados.')
  } else {
    write(`Saldo inicial ficticio a la fecha de referencia: ${money(projection.opening)}; no es un saldo real.`)
  }
  write('Supuestos y límites', true)
  write('El gráfico del panel compara semanas retrospectivas; este informe proyecta cuatro semanas futuras mediante promedios del período aplicado. Los métodos y fechas son distintos.')
  write(`Ingresos y egresos diarios promedio: totales históricos divididos por ${projection.days} días. Se multiplican por 7 y redondean a centavos: ingresos ${money(projection.weeklyInflows)} y egresos ${money(projection.weeklyOutflows)} por semana. El saldo semanal suma ingresos y resta egresos al saldo anterior.`)
  if (dashboard.emptyPeriod) write('Sin movimientos históricos: se suponen flujos futuros cero; no hay base para estimar tendencias.')
  write(`Ejemplo hipotético: gasto único de ${money(projection.exampleSpend)} el primer día, igual al 10% del saldo inicial que supera la reserva (mínimo cero), redondeado a centavos. No registra movimientos.`)
  write('Comparación semanal', true)
  projection.weeks.forEach((week, index) => {
    write(`Semana ${index + 1}: ${date(week.startDate)} al ${date(week.endDate)}` , true)
    write(`Saldo base: ${money(week.baseline)}. Con gasto: ${money(week.scenario)}. Diferencia: ${money(week.scenario - week.baseline)}.`)
    write(`Faltante respecto de la reserva: base ${money(week.baselineShortfall)}; con gasto ${money(week.scenarioShortfall)}.`)
  })
  write('Interpretación', true)
  write('La comparación muestra posibles efectos sobre la liquidez y la reserva, no predice resultados. Los promedios constantes omiten variaciones, estacionalidad y cambios futuros. No constituye asesoramiento de inversión ni garantiza rentabilidad.')
  return pdf
}
