// Every dataset the project delivers, built once for define.xml, the reviewer's guide and the
// submission package: the mapped domains with their SUPP-- or NS--, RELREC, the trial design
// tables and SE (derived from DM and the design).

import { build, type Built, type StudyData } from './engine'
import { buildRelrec } from './relrec'
import { designBuilt, deriveSE } from './design'
import { TRIAL_DESIGN } from './standards'
import type { Project } from './project'

export function allDatasets(p: Project, data: StudyData): Map<string, Built> {
  const m = new Map<string, Built>()
  for (const d of Object.keys(p.specs).sort()) { const s = p.specs[d]; if (!s.vars.length) continue; const b = build(s, data, p.version); m.set(d, b); if (b.supp) m.set(b.supp.domain, b.supp) }
  if (p.relrec?.length) { const rel = buildRelrec(p.relrec, Object.fromEntries([...m].filter(([k]) => p.specs[k])), data); if (rel.rows.length) m.set('RELREC', rel) }
  if (!p.imported) {
    for (const d of TRIAL_DESIGN) if (p.design[d]?.length) m.set(d, designBuilt(d, p.design[d], p.version))
    m.set('SE', deriveSE())
  }
  return m
}
