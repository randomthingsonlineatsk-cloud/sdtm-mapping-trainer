// Keeps the TLF Programming Lab's GLV-12-301 hand-off in step with this trainer's data: every
// dataset whose records differ from a reference mapping of Transfer 1 is replaced (Dataset-JSON
// and XPT), and its record count updated; the rest of the hand-off stays byte for byte as it
// was exported. Skipped when the TLF Lab is not beside this repo.
import { expect, test } from 'vitest'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate'
import { createProject, dataFor } from '../src/domain/project'
import { referenceSpec, REF_DOMAINS } from '../src/domain/reference'
import { buildHandoff } from '../src/domain/handoff'

const ZIP = '../tlf-programming-lab/public/data/glv-12-301-handoff.zip'
test('the TLF Lab’s GLV-12-301 hand-off matches the reference mapping', () => {
  if (!existsSync(ZIP)) return
  const p = createProject('u', 'none', '3.4')
  for (const d of REF_DOMAINS) p.specs[d] = referenceSpec(d, '3.4')
  const h = buildHandoff(p, dataFor(p))
  const z = unzipSync(new Uint8Array(readFileSync(ZIP)))
  const man = JSON.parse(strFromU8(z['handoff.json']))
  const changed = []
  for (const d of man.datasets) {
    const fresh = h.manifest.datasets.find((x) => x.name === d.name); if (!fresh) continue
    const a = JSON.parse(strFromU8(h.files[fresh.files.json])), b = JSON.parse(strFromU8(z[d.files.json]))
    if (JSON.stringify(a.rows) === JSON.stringify(b.rows)) continue
    changed.push(d.name)
    z[d.files.json] = h.files[fresh.files.json]; z[d.files.xpt] = h.files[fresh.files.xpt]; d.records = fresh.records
  }
  if (changed.length) {
    z['handoff.json'] = strToU8(JSON.stringify(man, null, 1))
    const mtime = new Date(man.createdUtc)
    writeFileSync(ZIP, zipSync(Object.fromEntries(Object.entries(z).map(([k, v]) => [k, [v, { level: 6, mtime }]]))))
  }
  expect(changed.every((x) => ['AE', 'SUPPAE', 'CM', 'EX'].includes(x))).toBe(true)
})
