// The hand-off to the TLF Programming Lab: what an analysis programmer receives from the SDTM
// team at database lock. One zip with every SDTM dataset as Dataset-JSON v1.1 and as XPT v5,
// define.xml with its stylesheet, and handoff.json: a manifest the Lab reads first, with the
// study, the standards and versions, the data transfer, each dataset's label, class, structure,
// keys, record count and variable metadata (label, type, length, role, codelist, origin), and
// the validation status with every issue's explanation.

import { zipSync, strToU8 } from 'fflate'
import type { Built, StudyData } from './engine'
import { toXpt, toDatasetJson } from './exports'
import { buildDefine, toDefineXml, STYLESHEET, type DefineModel } from './define'
import { DEFINE_XSL } from './defineXsl'
import { crfPages, layoutAcrf } from './acrf'
import { allDatasets } from './datasets'
import { packageFindings, toIssues, statusOf, explanationOf } from './validation'
import { TRIAL_DESIGN, CT_INFO, VERSION_LABEL } from './standards'
import { STUDY } from './study'
import { TRANSFERS } from './seed'
import { packOf, studyIdOf, type Project } from './project'

export const HANDOFF_FORMAT = 'sdtm-trainer-handoff'
export interface HandoffVariable { name: string; label: string; type: string; length?: number; key?: number; role?: string; mandatory: boolean; codelist?: string; origin: string; derivation?: string }
export interface HandoffDataset { name: string; label: string; class: string; structure: string; keys: string[]; records: number; files: { json: string; xpt: string }; variables: HandoffVariable[] }
export interface Handoff {
  format: typeof HANDOFF_FORMAT; version: 1; createdUtc: string
  producer: { app: string; project: string; userId: string; classId: string }
  study: { id: string; title: string; transfer: { number: number; label: string; date: string } | null; source?: { kind: 'shipped' | 'learner'; lock: string; name?: string; exportedUtc?: string } }
  standards: { model: string; ct: string; define: string; datasetJson: string; xpt: string }
  validation: { ruleSet: string; lastRunUtc: string | null; mustFix: number; open: number; explained: number; issues: { dataset: string; check: string; severity: string; variable: string; records: number; status: string; explanation?: string }[] }
  datasets: HandoffDataset[]
  files: string[]
}

export function defineFor(p: Project, data: StudyData, all: Map<string, Built>): DefineModel {
  const pack = packOf(p)
  return buildDefine({
    builts: all, specs: p.specs, version: p.version, laid: pack ? [] : layoutAcrf(crfPages(data.forms), p.acrf ?? {}), designDomains: TRIAL_DESIGN,
    ...(pack ? { study: { id: pack.id, title: pack.title }, rawFields: pack.rawFields, formSource: Object.fromEntries(Object.entries(pack.formInfo).map(([k, v]) => [k, v.source === 'EDC' ? 'Investigator' : 'Vendor'])) } : {}),
  })
}

export function buildHandoff(p: Project, data: StudyData, now = new Date()): { manifest: Handoff; files: Record<string, Uint8Array> } {
  const all = allDatasets(p, data)
  if (!all.size) throw new Error('Map a domain first: there is nothing to hand off.')
  const m = defineFor(p, data, all)
  const items = new Map(m.items.map((i) => [i.oid, i]))
  const methods = new Map(m.methods.map((x) => [x.oid, x]))
  const issues = toIssues(packageFindings(p, data, all))
  const last = (p.validation ?? []).at(-1)
  const files: Record<string, Uint8Array> = {}
  const datasets: HandoffDataset[] = m.datasets.map((d) => {
    const b = all.get(d.name)!
    const base = d.name.toLowerCase()
    files[`datasets/${base}.json`] = strToU8(JSON.stringify(toDatasetJson(b, p.version, d.keys, now)))
    files[`datasets/${base}.xpt`] = toXpt(b, p.version, now).bytes
    return {
      name: d.name, label: d.label, class: d.cls, structure: d.structure, keys: d.keys, records: b.rows.length, files: { json: `datasets/${base}.json`, xpt: `datasets/${base}.xpt` },
      variables: d.refs.map((r) => {
        const it = items.get(r.item)!
        const der = (r.method && methods.get(r.method)?.description) || it.origin.text
        return { name: it.name, label: it.label, type: it.dataType, ...(it.length ? { length: it.length } : {}), ...(r.key ? { key: r.key } : {}), ...(r.role ? { role: r.role } : {}), mandatory: r.mandatory, ...(it.codelist ? { codelist: it.codelist.slice(3) } : {}), origin: `${it.origin.type}${it.origin.source ? ` (${it.origin.source})` : ''}`, ...(der ? { derivation: der } : {}) }
      }),
    }
  })
  files['define.xml'] = strToU8(toDefineXml(m))
  files[STYLESHEET] = strToU8(DEFINE_XSL)
  const t = packOf(p) ? null : TRANSFERS[p.transfer ?? 1]
  const count = (s: string) => issues.filter((i) => statusOf(i, p) === s).length
  const manifest: Handoff = {
    format: HANDOFF_FORMAT, version: 1, createdUtc: now.toISOString(),
    producer: { app: 'SDTM Mapping Trainer', project: p.name, userId: p.userId, classId: p.classId },
    study: { id: studyIdOf(p), title: packOf(p)?.title ?? STUDY.title, transfer: t ? { number: p.transfer ?? 1, label: t.label, date: t.date } : null, ...(p.study === 'HRP-301' ? { source: p.cdm ? { kind: 'learner' as const, lock: p.cdm.lock, name: p.cdm.source, exportedUtc: p.cdm.exportedUtc } : { kind: 'shipped' as const, lock: 'hard' } } : {}) },
    standards: { model: VERSION_LABEL[p.version], ct: CT_INFO.label, define: 'Define-XML 2.1', datasetJson: 'Dataset-JSON 1.1', xpt: 'SAS V5 transport' },
    validation: {
      ruleSet: p.ruleSet, lastRunUtc: last?.utc ?? null, mustFix: count('Must fix'), open: count('Open'), explained: count('Explained'),
      issues: issues.map((i) => ({ dataset: i.dataset, check: i.rule, severity: i.sev, variable: i.variable, records: i.count, status: statusOf(i, p), ...(explanationOf(p, i.key) ? { explanation: explanationOf(p, i.key)!.text } : {}) })),
    },
    datasets,
    files: ['handoff.json', ...Object.keys(files).sort()],
  }
  files['handoff.json'] = strToU8(JSON.stringify(manifest, null, 1))
  return { manifest, files }
}

export function zipHandoff(files: Record<string, Uint8Array>, now = new Date()): Uint8Array {
  return zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, [v, { level: 6, mtime: now }]])))
}
