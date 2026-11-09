import { describe, expect, test } from 'vitest'
import { build } from '../src/domain/engine'
import { referenceSpec, studyData } from '../src/domain/reference'
import { check } from '../src/domain/conformance'
import { crfPages, layoutAcrf, suggest } from '../src/domain/acrf'
import { traceValue, parseTrace, fieldsRead } from '../src/domain/trace'

const data = studyData()
const specs = { VS: referenceSpec('VS', '3.4'), DM: referenceSpec('DM', '3.4') }
const vs = build(specs.VS, data)
const dm = build(specs.DM, data)

describe('Traceability Graph', () => {
  test('trace keys parse back to form, row and test column', () => {
    expect(parseTrace('VS:r12:WEIGHT')).toEqual({ form: 'VS', id: 'r12', field: 'WEIGHT', part: undefined })
    expect(parseTrace('DS:r3~2')).toEqual({ form: 'DS', id: 'r3', field: undefined, part: 2 })
  })
  test('fieldsRead finds raw fields in copies and expressions, and maps the result pseudo-field to the test column', () => {
    expect(fieldsRead({ kind: 'copy', field: 'SEX' }, ['SEX', 'RACE'])).toEqual(['SEX'])
    expect(fieldsRead({ kind: 'expr', expr: "iso(VSDAT, VSTIM)" }, ['VSDAT', 'VSTIM', 'X']).sort()).toEqual(['VSDAT', 'VSTIM'])
    expect(fieldsRead({ kind: 'copy', field: '__RESULT' }, ['WEIGHT'], 'WEIGHT')).toEqual(['WEIGHT'])
    expect(fieldsRead({ kind: 'const', value: 'X' }, ['A'])).toEqual([])
  })
  test('a VS result traces to the raw vital signs row and its test column; without aCRF annotations the chain is broken', () => {
    const i = vs.rows.findIndex((r) => r.VSTESTCD === 'WEIGHT' && r.VSORRES !== '')
    const t = traceValue({ domain: 'VS', built: vs, rowIndex: i, variable: 'VSORRES', spec: specs.VS, forms: data.forms, version: '3.4', laid: layoutAcrf(crfPages(data.forms), {}), specs, findings: check(vs, '3.4', dm) })
    const raw = t.nodes.find((n) => n.id === 'raw')!
    expect(raw.lines.join(' ')).toMatch(/WEIGHT = /)
    expect(t.nodes.find((n) => n.id === 'define')!.lines[0]).toMatch(/Collected/)
    expect(t.broken.some((b) => /aCRF/.test(b))).toBe(true)
    expect(t.edges).toHaveLength(6)
  })
  test('with the suggested aCRF annotations the page is found and the chain is complete', () => {
    const pages = crfPages(data.forms)
    const notes = Object.fromEntries(pages.map((pg) => [pg.form, suggest(pg.form, specs, [], '3.4')]))
    const i = dm.rows.findIndex((r) => r.SEX !== '')
    const t = traceValue({ domain: 'DM', built: dm, rowIndex: i, variable: 'SEX', spec: specs.DM, forms: data.forms, version: '3.4', laid: layoutAcrf(pages, notes), specs, findings: [] })
    expect(t.nodes.find((n) => n.id === 'source')!.lines.join(' ')).toMatch(/page/)
    expect(t.broken).toEqual([])
    expect(t.nodes.find((n) => n.id === 'findings')!.lines[0]).toBe('None on this value')
  })
})
