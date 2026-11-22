// The oncology study for the CSR & Narrative Studio: the reference SDTM of ONK-44-302 (DM, TU, TR,
// RS, PR, DD) and the randomisation dates from the IRT file, written into the Studio's data.
import { expect, test } from 'vitest'
import { writeFileSync, existsSync } from 'node:fs'
import { build } from '../src/domain/engine'
import { onkData, onkRaw, onkReferenceSpec, ONK_DOMAINS, ONK_STUDY, ONK_CUT } from '../src/domain/onc'

test('ONK-44-302 SDTM for the CSR & Narrative Studio', () => {
  const data = onkData(), domains = {}
  for (const d of ONK_DOMAINS) { const b = build(onkReferenceSpec(d, '3.4'), data); const cols = b.vars; domains[d] = { columns: cols, rows: b.rows.map((r) => cols.map((c) => r[c] ?? null)) } }
  const irt = onkRaw().forms.IRT
  domains.IRT = { columns: ['USUBJID', 'RANDDT', 'RANDARM'], rows: irt.map((r) => [`${ONK_STUDY.id}-${r.SUBJID}`, String(r.RANDDT), String(r.RANDARM)]) }
  expect(domains.DM.rows.length).toBe(48); expect(domains.IRT.rows.length).toBe(42)
  const out = { format: 'csr-studio/sdtm', schema: 1, study: ONK_STUDY.id, source: `SDTM Mapping Trainer: reference mapping of ${ONK_STUDY.id} (data cut-off ${ONK_CUT}), with the randomisation dates from the IRT file`, cutoff: ONK_CUT, domains }
  const dir = '../csr-narrative-studio/src/data'
  if (existsSync(dir)) writeFileSync(`${dir}/sdtm-onk-44-302.json`, JSON.stringify(out))
})
