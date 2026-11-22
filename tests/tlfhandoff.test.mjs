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

// HRP-301: the same, and a dataset the hand-off does not have yet (DS) is added with its manifest entry.
const HZIP = '../tlf-programming-lab/tests/fixtures/hrp301_sdtm_handoff.zip'
test('the TLF Lab’s HRP-301 hand-off matches the reference mapping, DS included', async () => {
  if (!existsSync(HZIP)) return
  const { hrpReferenceSpec, HRP_DOMAINS } = await import('../src/domain/hrp')
  const p = createProject('u', 'none', '3.4', 'HRP-301')
  for (const d of HRP_DOMAINS) p.specs[d] = hrpReferenceSpec(d, '3.4')
  const h = buildHandoff(p, dataFor(p))
  const z = unzipSync(new Uint8Array(readFileSync(HZIP)))
  const man = JSON.parse(strFromU8(z['handoff.json']))
  const changed = []
  for (const fresh of h.manifest.datasets) {
    const d = man.datasets.find((x) => x.name === fresh.name)
    if (!d) { man.datasets.push(fresh); z[fresh.files.json] = h.files[fresh.files.json]; z[fresh.files.xpt] = h.files[fresh.files.xpt]; changed.push(fresh.name); continue }
    const a = JSON.parse(strFromU8(h.files[fresh.files.json])), b = JSON.parse(strFromU8(z[d.files.json]))
    if (JSON.stringify(a.rows) === JSON.stringify(b.rows)) continue
    changed.push(d.name); z[d.files.json] = h.files[fresh.files.json]; z[d.files.xpt] = h.files[fresh.files.xpt]; d.records = fresh.records
  }
  if (changed.length) {
    man.datasets.sort((a, b) => a.name.localeCompare(b.name))
    z['handoff.json'] = strToU8(JSON.stringify(man, null, 1))
    const mtime = new Date(man.createdUtc)
    writeFileSync(HZIP, zipSync(Object.fromEntries(Object.entries(z).map(([k, v]) => [k, [v, { level: 6, mtime }]]))))
  }
  expect(man.datasets.some((d) => d.name === 'DS')).toBe(true)
})

// ONK-44-302: the oncology hand-off the TLF Lab's oncology programs run on, written when it is
// missing or its datasets' records changed (a fixed export time keeps the zip stable).
const OZIP = '../tlf-programming-lab/tests/fixtures/onk44302_sdtm_handoff.zip'
test('the TLF Lab’s ONK-44-302 hand-off matches the reference mapping', async () => {
  if (!existsSync('../tlf-programming-lab/tests/fixtures')) return
  const { onkReferenceSpec, ONK_DOMAINS } = await import('../src/domain/onc')
  const p = createProject('u', 'none', '3.4', 'ONK-44-302')
  for (const d of ONK_DOMAINS) p.specs[d] = onkReferenceSpec(d, '3.4')
  const h = buildHandoff(p, dataFor(p), new Date('2026-11-05T09:00:00Z'))
  expect(h.manifest.datasets.map((d) => d.name).sort()).toEqual(['DD', 'DM', 'DS', 'PR', 'RS', 'TR', 'TU'])
  const same = existsSync(OZIP) && (() => { const z = unzipSync(new Uint8Array(readFileSync(OZIP))); return h.manifest.datasets.every((d) => z[d.files.json] && JSON.stringify(JSON.parse(strFromU8(z[d.files.json])).rows) === JSON.stringify(JSON.parse(strFromU8(h.files[d.files.json])).rows)) })()
  if (!same) { const mtime = new Date('2026-11-05T09:00:00Z'); writeFileSync(OZIP, zipSync(Object.fromEntries([['handoff.json', strToU8(JSON.stringify(h.manifest, null, 1))], ...Object.entries(h.files)].map(([k, v]) => [k, [v, { level: 6, mtime }]])))) }
})
