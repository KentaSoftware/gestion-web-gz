import { jsPDF } from 'jspdf'
import type { FinanceDashboard } from '@/interfaces/finance.interface'
import { projectFinance } from './financeProjection'

const money = (value: number) => `ARS ${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const date = (value: string) => value.split('-').reverse().join('/')

export function createProjectionPdf(dashboard: FinanceDashboard, exportedAt = new Date()) {
  const projection = projectFinance(dashboard, exportedAt)
  const pdf = new jsPDF()
  const compact = (value: number) => Math.abs(value) >= 1e9
    ? `ARS ${value.toExponential(2)}`
    : money(value)
  const label = (text: string, x: number, y: number, size = 9, bold = false) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(size).setTextColor(31, 42, 61)
    pdf.text(text, x, y)
  }
  pdf.setFillColor(31, 42, 61).rect(0, 0, 210, 9, 'F')
  pdf.setTextColor(255).setFont('helvetica', 'bold').setFontSize(9).text('DATOS FICTICIOS  /  NO SON TRANSACCIONES', 18, 6)
  label('Proyección de caja', 18, 22, 21, true)
  label(`Cuatro semanas desde ${date(projection.asOfDate)}  ·  Moneda ARS`, 18, 29, 10)
  const metrics = [
    ['SALDO DE REFERENCIA', compact(projection.opening)],
    ['RESERVA', compact(projection.reserve)],
    ['GASTO HIPOTÉTICO', compact(projection.exampleSpend)],
  ]
  metrics.forEach(([title, value], index) => {
    const x = 18 + index * 59
    pdf.setFillColor(238, 243, 250).rect(x, 35, 56, 21, 'F')
    label(title, x + 3, 41, 7, true)
    // Long amounts are shown in full in the detailed reconciliation.
    label(value, x + 3, 49, value.length > 17 ? 7 : 10, true)
  })
  label('Saldo proyectado por cierre semanal', 18, 67, 12, true)
  label('Base: línea continua  ·  Con gasto: línea discontinua y cuadrados', 18, 73, 8)
  label('Reserva de referencia: línea punteada  ·  eje vertical: ARS', 18, 78, 8)

  const left = 47, right = 187, top = 86, bottom = 148
  const values = [projection.reserve, ...projection.weeks.flatMap(week => [week.baseline, week.scenario])]
  const scale = Math.max(1, ...values.map(value => Math.abs(value)))
  const normalized = values.map(value => value / scale)
  let min = Math.min(...normalized), max = Math.max(...normalized)
  if (min === max) { min -= 0.5; max += 0.5 }
  else { const padding = (max - min) * 0.1; min -= padding; max += padding }
  const py = (value: number) => bottom - (value / scale - min) / (max - min) * (bottom - top)
  const px = (index: number) => left + index * (right - left) / 3
  pdf.setDrawColor(190, 200, 215).setLineWidth(0.2)
  for (let i = 0; i <= 2; i++) {
    const y = top + i * (bottom - top) / 2
    pdf.line(left, y, right, y)
    const value = (max - i * (max - min) / 2) * scale
    label(compact(value), 18, y + 1, 6)
  }
  pdf.setDrawColor(90, 100, 115).setLineDashPattern([1, 2], 0)
  pdf.line(left, py(projection.reserve), right, py(projection.reserve))
  const series = [projection.weeks.map(week => week.baseline), projection.weeks.map(week => week.scenario)]
  series.forEach((points, seriesIndex) => {
    pdf.setDrawColor(seriesIndex ? 160 : 62, seriesIndex ? 85 : 104, seriesIndex ? 30 : 164)
    pdf.setLineWidth(seriesIndex ? 0.6 : 0.8).setLineDashPattern(seriesIndex ? [2, 1.5] : [], 0)
    points.forEach((value, index) => {
      if (index) pdf.line(px(index - 1), py(points[index - 1]), px(index), py(value))
      if (seriesIndex) pdf.rect(px(index) - 1.2, py(value) - 1.2, 2.4, 2.4, 'S')
      else pdf.circle(px(index), py(value), 0.9, 'F')
    })
  })
  pdf.setLineDashPattern([], 0)
  projection.weeks.forEach((week, index) => label(date(week.endDate), px(index) - 9, 155, 7))
  const belowBase = projection.weeks.filter(week => week.baseline < projection.reserve).length
  const belowScenario = projection.weeks.filter(week => week.scenario < projection.reserve).length
  label('LECTURA DE LOS CIERRES', 18, 168, 8, true)
  label(`En los cuatro cierres: base bajo reserva ${belowBase}/4; con gasto ${belowScenario}/4.`, 18, 175, 10, true)
  label('Solo compara cierres semanales; no describe mínimos entre fechas.', 18, 181, 9)
  label('FLUJOS PROYECTADOS POR SEMANA', 18, 195, 8, true)
  const flowMax = Math.max(1, Math.abs(projection.weeklyInflows), Math.abs(projection.weeklyOutflows))
  const flow = (name: string, value: number, y: number, filled: boolean) => {
    label(name, 18, y + 4, 8)
    pdf.setDrawColor(62, 104, 164).setFillColor(62, 104, 164)
    const width = Math.abs(value) / flowMax * 75
    if (width > 0) pdf.rect(43, y, width, 5, filled ? 'F' : 'S')
    label(compact(value), 122, y + 4, 8)
  }
  flow('Ingresos', projection.weeklyInflows, 201, true)
  flow('Egresos', projection.weeklyOutflows, 211, false)
  label('Barras: magnitud absoluta; importe con signo indicado.', 18, 224, 8)
  label('Detalle, fechas y supuestos en las páginas siguientes.', 18, 235, 9)
  pdf.addPage()
  let y = 20
  const pendingHeadings: string[] = []
  const linesFor = (text: string, heading: boolean): string[] => {
    pdf.setFont('helvetica', heading ? 'bold' : 'normal')
    pdf.setFontSize(heading ? 11 : 9)
    return pdf.splitTextToSize(text, 174)
  }
  const draw = (text: string, heading: boolean) => {
    const lines = linesFor(text, heading)
    for (const line of lines) {
      if (y > 275) { pdf.addPage(); y = 20 }
      pdf.text(line, 18, y)
      y += heading ? 5 : 4
    }
    y += 2
  }
  const write = (text: string, heading = false) => {
    if (heading) {
      pendingHeadings.push(text)
      return
    }
    const headingHeight = pendingHeadings.reduce((height, item) => height + linesFor(item, true).length * 5 + 2, 0)
    if (pendingHeadings.length > 0 && y + headingHeight + 4 > 275) { pdf.addPage(); y = 20 }
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
