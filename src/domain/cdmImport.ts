// Import a study from the CDM Query & Edit-Check Console: its project file holds every form a
// site entered, with the current value of each field. The forms become raw datasets here, with
// the console's CDASH field names, so a learner can map the hypertension study (HLV-204-201) or
// the vaccine study (ALV-3-301) for practice. There is no reference mapping for these: missions
// run on GLV-12-301.

import type { ImportedStudy } from './project'
import type { Row } from './seed'
import type { Visit } from './study'

interface CdmItem { versions: { value: string }[] }
interface CdmFile { format?: string; project?: { study?: string; forms?: Record<string, { deleted?: boolean }>; items?: Record<string, CdmItem>; name?: string } }

const v = (raw: string, num: number, name: string, day: number): Visit => ({ raw, num, name, day, lo: day, hi: day, epoch: 'TREATMENT', vs: [] })
const SCHEDULES: Record<string, { title: string; visits: Visit[] }> = {
  'HLV-204-201': { title: 'Vasclarin (VSC-9) in stage 1 or 2 hypertension (CDM Console study)', visits: [v('SCR', 1, 'SCREENING', -14), v('D1', 2, 'DAY 1', 1), v('W2', 3, 'WEEK 2', 15), v('W4', 4, 'WEEK 4', 29), v('W8', 5, 'WEEK 8', 57), v('W12', 6, 'WEEK 12', 85), v('FU', 7, 'FOLLOW-UP', 99)] },
  'ALV-3-301': { title: 'Aurelivax (ALV-3) vaccine trial with e-diary (CDM Console study)', visits: [v('D1', 1, 'DAY 1', 1), v('PC1', 2, 'DAY 8 PHONE CONTACT', 8), v('D29', 3, 'DAY 29', 29), v('PC2', 4, 'DAY 36 PHONE CONTACT', 36), v('D57', 5, 'DAY 57', 57), v('D181', 6, 'DAY 181', 181)] },
}

export function importCdmProject(text: string): ImportedStudy {
  let f: CdmFile
  try { f = JSON.parse(text) } catch { throw new Error('This file is not valid JSON.') }
  if (f?.format !== 'cdm-query-console-project' || !f.project?.forms || !f.project.items) throw new Error('This is not a CDM Query & Edit-Check Console project file. Export one from the console’s Project tab.')
  const protocol = f.project.study ?? 'HLV-204-201'
  const sched = SCHEDULES[protocol]
  if (!sched) throw new Error(`Unknown study ${protocol}.`)
  const rows = new Map<string, Row>()
  for (const [fk, fs] of Object.entries(f.project.forms)) {
    if (fs.deleted) continue
    const [subj, visit, form, inst] = fk.split('|')
    rows.set(fk, { __id: `${form}-${fk}`, SUBJID: subj, SITEID: subj.split('-')[0], VISIT: visit === 'LOG' ? '' : visit, INSTANCE: inst } as Row)
  }
  for (const [k, item] of Object.entries(f.project.items)) {
    const i = k.lastIndexOf('|'); const fk = k.slice(0, i), field = k.slice(i + 1)
    const r = rows.get(fk); if (!r) continue
    r[field] = item.versions[item.versions.length - 1]?.value ?? ''
  }
  const forms: Record<string, Row[]> = {}
  for (const [fk, r] of rows) { const form = fk.split('|')[2]; (forms[form] ??= []).push(r) }
  for (const list of Object.values(forms)) list.sort((a, b) => a.SUBJID.localeCompare(b.SUBJID) || (a.VISIT ?? '').localeCompare(b.VISIT ?? '') || Number(a.INSTANCE) - Number(b.INSTANCE))
  if (!Object.keys(forms).length) throw new Error('The project has no entered forms yet. Advance its study clock in the console first.')
  return {
    protocol, title: sched.title, source: f.project.name ?? 'CDM Console project', importedUtc: new Date().toISOString(), forms, visits: sched.visits,
    notes: [
      'Imported as entered at the sites, with the console’s CDASH field names. Forms are one row per form instance; subject-level logs (AE, CM, DV) have no visit.',
      'There is no reference mapping for an imported study: missions run on GLV-12-301. Study day and epoch functions use the DM you map here.',
      'Unscheduled visits (UNS) are numbered after the last scheduled visit, as in GLV-12-301.',
      ...(protocol === 'ALV-3-301' ? ['The vaccine study’s e-diary is held by the diary vendor and is not in the console’s project file; its CE, FACE and IS mapping comes as a Phase 5 mission.'] : []),
    ],
  }
}
