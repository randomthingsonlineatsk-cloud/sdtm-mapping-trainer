// The submission package: the SDTM tabulation folder of an eCTD module 5 dataset folder
// (m5/datasets/<study>/tabulations/sdtm/) with one SAS V5 transport file per dataset, define.xml
// with its stylesheet, acrf.pdf and csdrg.pdf, zipped in the browser. Package checks say what a
// gateway or a reviewer would stop on before the folder is sent.

import type { Built, StudyData } from './engine'
import { toXpt } from './exports'
import { crfPages, checkAcrf } from './acrf'
import { buildCsdrg } from './csdrg'
import { allDatasets } from './datasets'
import { packageFindings, toIssues, statusOf, type Issue } from './validation'
import { TRIAL_DESIGN } from './standards'
import type { Project } from './project'

export const sdtmFolder = (study: string) => `m5/datasets/${study.toLowerCase()}/tabulations/sdtm/`
export interface PkgFile { name: string; bytes: Uint8Array; what: string }
export interface PkgFinding { rule: string; sev: 'Error' | 'Warning'; where: string; msg: string }
export const PKG_RULES: Record<string, string> = {
  'PKG-001': 'Findings that must be fixed (Reject, mapping errors, define.xml) remain: fix them on the Validation tab’s list.',
  'PKG-002': 'Issues not fixed need an explanation in the reviewer’s guide: explain them on the Validation tab.',
  'PKG-003': 'The transport file breaks the XPT version 5 limits (non-ASCII text, values over 200 bytes, names or labels too long): fix the values in the mapping.',
  'PKG-004': 'The FDA expects DM and the trial design datasets (TS is checked at the gateway): build them.',
  'PKG-005': 'The aCRF disagrees with the mapping: fix the annotations on the aCRF tab.',
  'PKG-006': 'The reviewer’s guide is incomplete: see its checks.',
  'PKG-007': 'Run validation under the rule set of the submission after the last change, so the guide’s conformance inputs are current.',
}

export interface PackagePlan { all: Map<string, Built>; issues: Issue[]; findings: PkgFinding[] }
export function planPackage(p: Project, data: StudyData): PackagePlan {
  const all = allDatasets(p, data)
  const issues = toIssues(packageFindings(p, data, all))
  const F: PkgFinding[] = []
  const must = issues.filter((i) => statusOf(i, p) === 'Must fix'), open = issues.filter((i) => statusOf(i, p) === 'Open')
  if (must.length) F.push({ rule: 'PKG-001', sev: 'Error', where: 'Validation', msg: `${must.length} issue${must.length === 1 ? '' : 's'} must be fixed: ${must.slice(0, 4).map((i) => `${i.dataset} ${i.rule} ${i.variable}`).join(', ')}${must.length > 4 ? ' …' : ''}` })
  const openE = open.filter((i) => i.sev !== 'Warning'), openW = open.filter((i) => i.sev === 'Warning')
  if (openE.length) F.push({ rule: 'PKG-002', sev: 'Error', where: 'Validation', msg: `${openE.length} Error issue${openE.length === 1 ? '' : 's'} neither fixed nor explained` })
  if (openW.length) F.push({ rule: 'PKG-002', sev: 'Warning', where: 'Validation', msg: `${openW.length} Warning issue${openW.length === 1 ? '' : 's'} not explained` })
  for (const [name, b] of all) { const w = toXpt(b, p.version).report.warnings; if (w.length) F.push({ rule: 'PKG-003', sev: 'Error', where: `${name.toLowerCase()}.xpt`, msg: w.slice(0, 2).join('; ') }) }
  if (!all.has('DM')) F.push({ rule: 'PKG-004', sev: 'Error', where: 'dm.xpt', msg: 'No DM' })
  for (const d of TRIAL_DESIGN) if (!all.has(d)) F.push({ rule: 'PKG-004', sev: d === 'TS' ? 'Error' : 'Warning', where: `${d.toLowerCase()}.xpt`, msg: `No ${d}` })
  const acrfErr = checkAcrf(crfPages(data.forms), p.acrf ?? {}, p.specs, p.relrec ?? [], p.version).filter((f) => f.sev === 'Error')
  if (acrfErr.length) F.push({ rule: 'PKG-005', sev: 'Error', where: 'acrf.pdf', msg: `${acrfErr.length} aCRF error${acrfErr.length === 1 ? '' : 's'}` })
  const last = (p.validation ?? []).at(-1)
  const guide = buildCsdrg(p, data, all, issues, last).findings.filter((f) => !['CSD-001', 'CSD-002', 'CSD-003'].includes(f.rule)) // those are PKG-001/002
  for (const g of guide) F.push({ rule: 'PKG-006', sev: g.sev, where: `csdrg.pdf ${g.where}`, msg: g.msg })
  const now = issues.map((i) => i.key).sort().join('\n')
  if (!last || last.ruleSet !== p.ruleSet || last.transfer !== (p.transfer ?? 1) || [...last.keys].sort().join('\n') !== now) F.push({ rule: 'PKG-007', sev: 'Warning', where: 'Validation', msg: last ? 'The last validation run does not match the package as it is now' : 'No validation run recorded' })
  return { all, issues, findings: F }
}
