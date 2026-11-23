// ONK-44-302 end to end: the CDM Query & Edit-Check Console's cleaned, hard-locked database
// (tests/fixtures/onk-cdm-locked.json, written by that app's tests/onkhandoff.test.mjs) gives back the
// study's raw datasets exactly, so its SDTM is the reference SDTM mapped here.
import { describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { cdmForms } from '../src/domain/cdmImport'
import { onkFromCdm, ONK_EDC_FORMS } from '../src/domain/onkCdm'
import { onkData, onkDataFrom, onkRaw, onkReferenceSpec, ONK_DOMAINS } from '../src/domain/onc'
import { build } from '../src/domain/engine'

const file = readFileSync(new URL('./fixtures/onk-cdm-locked.json', import.meta.url), 'utf8')
const strip = (rows) => rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !k.startsWith('__'))))

describe('ONK-44-302 from the CDM Console', () => {
  const head = cdmForms(file)
  test('the file is the hard-locked ONK-44-302 database', () => {
    expect(head.protocol).toBe('ONK-44-302'); expect(head.lock).toBe('hard')
  })
  test('the locked eCRF gives back every raw dataset, row for row', () => {
    const got = onkFromCdm(head.forms), want = onkRaw().forms
    for (const f of ONK_EDC_FORMS) expect(strip(got[f]), f).toEqual(strip(want[f]))
  })
  test('the reference SDTM from the console’s database equals the reference SDTM of the source', () => {
    const a = onkDataFrom(head.forms), b = onkData()
    for (const d of ONK_DOMAINS) expect(strip(build(onkReferenceSpec(d, '3.4'), a).rows), d).toEqual(strip(build(onkReferenceSpec(d, '3.4'), b).rows))
  })
})
