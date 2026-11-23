// ONK-44-302's source records for the CDM Query & Edit-Check Console: what the sites write in the
// eCRF and what the independent review sends, written into the console (src/domain/onk/source.json)
// when that repo is beside this one. Dates become ISO 8601 (a partial death date stays YYYY-MM).
// The console's cleaned, locked data must equal these records, so the SDTM mapped here is the
// mapping of the console's database.
import { expect, test } from 'vitest'
import { existsSync, writeFileSync, readFileSync } from 'node:fs'
import { onkRaw, ONK_PLANTED, ONK_STUDY, ONK_CUT, ONK_SITES } from '../src/domain/onc'
import { anyDate } from '../src/domain/rawdate'

const DATES = ['DMDAT', 'BRTHDAT', 'ICDAT', 'EXSTDAT', 'EXENDAT', 'LCDAT', 'STDAT', 'ENDAT', 'ASSDAT', 'DTHDAT']
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const iso = (s) => { if (!s) return ''; const p = /^UN-([A-Z]{3})-(\d{4})$/.exec(s); if (p) return `${p[2]}-${String(MON.indexOf(p[1]) + 1).padStart(2, '0')}`; return anyDate(s) ?? s }
test('ONK-44-302 source records for the CDM Console', () => {
  const raw = onkRaw()
  const forms = Object.fromEntries(Object.entries(raw.forms).map(([k, rows]) => [k, rows.map((r) => Object.fromEntries(Object.entries(r).filter(([c]) => !c.startsWith('__')).map(([c, v]) => [c, DATES.includes(c) ? iso(String(v ?? '')) : String(v ?? '')])))]))
  expect(forms.DTH.some((r) => /^\d{4}-\d{2}$/.test(r.DTHDAT))).toBe(true)
  expect(forms.IRT.length).toBe(42)
  const out = { format: 'cdm-console/onk-source', schema: 1, study: ONK_STUDY.id, cutoff: ONK_CUT, source: 'SDTM Mapping Trainer: the ONK-44-302 source records (eCRF pages and the independent review file)', sites: ONK_SITES, planted: ONK_PLANTED, subjects: raw.subjects, forms }
  const F = '../cdm-query-console/src/domain/onk/source.json'
  if (existsSync('../cdm-query-console/src/domain/onk')) { const s = JSON.stringify(out); if (!existsSync(F) || readFileSync(F, 'utf8') !== s) writeFileSync(F, s) }
})
