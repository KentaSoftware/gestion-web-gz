import { describe, expect, it } from 'vitest'
import { createFinanceDemo } from './financeDemo'
import { createProjectionPdf, balanceScale } from './financeProjectionPdf'

describe('projection PDF', () => {
  it('renders a vector comparison and a closing-only reserve conclusion', () => {
    const dashboard = createFinanceDemo({ startDate: '2026-12-31', endDate: '2026-12-31' })
    Object.assign(dashboard.kpis, { currentBalance: 1000, effectiveReserve: 900, totalInflows: 0, totalOutflows: 0 })
    const output = createProjectionPdf(dashboard, new Date('2026-12-31T12:00:00Z')).output()
    expect(output).toContain('Saldo proyectado por cierre semanal')
    expect(output).toContain('Reserva de referencia')
    expect(output).toContain('En los cuatro cierres')
    expect(output).toContain('VALORES EXACTOS POR CIERRE')
    expect(output).toContain('ARS 1.000,00')
    expect(output).toContain('ARS 990,00')
    expect(output).toContain(' m\n')
    expect(output).toContain(' l\n')
    expect(output).toContain(' d\n')
  })

  it.each([
    [0, 0, 0, 0, 'base bajo reserva 0/4; con gasto 0/4'],
    [-100, 0, 0, 0, 'base bajo reserva 4/4; con gasto 4/4'],
    [1000, 950, 0, 10, 'base bajo reserva 4/4; con gasto 4/4'],
    [1e11, 2e10, 1e10, 2e10, 'base bajo reserva 3/4; con gasto 3/4'],
  ])('keeps chart coordinates finite for balance %s and reserve %s', (balance, reserve, inflows, outflows, conclusion) => {
    const dashboard = createFinanceDemo({ startDate: '2026-12-31', endDate: '2026-12-31' })
    Object.assign(dashboard.kpis, { currentBalance: balance, effectiveReserve: reserve, totalInflows: inflows, totalOutflows: outflows })
    const output = createProjectionPdf(dashboard, new Date('2026-12-31T12:00:00Z')).output()
    expect(output).toContain(conclusion)
    const points = Array.from(output.matchAll(/(-?[\d.]+) (-?[\d.]+) [ml]\n/g))
    expect(points.length).toBeGreaterThan(10)
    for (const point of points) {
      expect(Number(point[1])).toBeGreaterThanOrEqual(0)
      expect(Number(point[1])).toBeLessThanOrEqual(595.28)
      expect(Number(point[2])).toBeGreaterThanOrEqual(0)
      expect(Number(point[2])).toBeLessThanOrEqual(841.89)
    }
  })
  it('contains forecast dates and assumptions without fictional-data wording', () => {
    const dashboard = createFinanceDemo({ startDate: '2026-12-31', endDate: '2026-12-31' })
    const pdf = createProjectionPdf(dashboard, new Date('2026-12-31T12:00:00Z'))
    const text = pdf.output()
    expect(text).not.toMatch(/fictici|ejemplo|demo|fiction|synthetic/i)
    expect(text).toContain('Escenario hipotético')
    expect(text).toContain('01/01/2027')
    expect(text).toContain('28/01/2027')
    expect(text).toContain('hipot')
    expect(text).toContain('31/12/2026')
    expect(text).toContain('/Type /Page')
  })

  it.each([[1000, 990], [-100, -110], [0, 0], [1e12, 1e12], [-1e12, 1e12]])('scales balances %s and %s linearly with explicit bounds', (a, b) => {
    const scale = balanceScale([a, b])
    expect(scale.max).toBeGreaterThan(scale.min)
    expect(scale.min).toBeLessThanOrEqual(Math.min(a, b))
    expect(scale.max).toBeGreaterThanOrEqual(Math.max(a, b))
    expect(scale.position(a)).toBeGreaterThanOrEqual(0)
    expect(scale.position(a)).toBeLessThanOrEqual(1)
    expect(scale.position(b)).toBeGreaterThanOrEqual(0)
    expect(scale.position(b)).toBeLessThanOrEqual(1)
  })

  it('paginates long numeric content within the printable area', () => {
    const dashboard = createFinanceDemo({ startDate: '2026-12-31', endDate: '2026-12-31' })
    Object.assign(dashboard.kpis, { currentBalance: 1e11, effectiveReserve: 2e10, totalInflows: 1e10, totalOutflows: 2e10 })
    const pdf = createProjectionPdf(dashboard, new Date('2026-12-31T12:00:00Z'))
    expect(pdf.getNumberOfPages()).toBeGreaterThan(1)
    expect(pdf.output()).toContain('Semana 4:')
  })

  it('rejects extreme generator inputs before drawing a chart', () => {
    const dashboard = createFinanceDemo({ startDate: '2026-12-31', endDate: '2026-12-31' })
    Object.assign(dashboard.kpis, { currentBalance: 1e307, effectiveReserve: -1e307, totalInflows: 1e307, totalOutflows: 0 })
    expect(() => createProjectionPdf(dashboard, new Date('2026-12-31T12:00:00Z'))).toThrow(/límite.*1\.000\.000\.000\.000/)
  })

  it('labels the historical balance, estimated bridge, as-of date and chart distinction', () => {
    const dashboard = createFinanceDemo({ startDate: '2026-12-29', endDate: '2026-12-30' })
    const text = createProjectionPdf(dashboard, new Date('2027-01-01T12:00:00Z')).output()
    expect(text).toContain('30/12/2026')
    expect(text).toContain('01/01/2027')
    expect(text).toContain('02/01/2027')
    expect(text).toContain('estimado')
    expect(text).toContain('retrospectiv')
  })

  it('keeps section headings with their following content in the actual PDF pages', () => {
    const dashboard = createFinanceDemo({ startDate: '2026-12-29', endDate: '2026-12-30' })
    const output = createProjectionPdf(dashboard, new Date('2027-01-01T12:00:00Z')).output()
    const pages = Array.from(output.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g), match => match[1])
    for (const [heading, following] of [
      ['Supuestos y límites', 'El gráfico del panel'],
      ['Comparación semanal', 'Semana 1:'],
      ['Semana 1:', 'Saldo base:'],
      ['Semana 2:', 'Saldo base:'],
      ['Semana 3:', 'Saldo base:'],
      ['Semana 4:', 'Saldo base:'],
      ['Interpretación', 'La comparación muestra'],
    ]) {
      const page = pages.find(content => content.includes(heading))
      expect(page, heading).toBeDefined()
      expect(page, heading).toContain(following)
      expect(page!.indexOf(following, page!.indexOf(heading))).toBeGreaterThan(page!.indexOf(heading))
    }
  })
})
