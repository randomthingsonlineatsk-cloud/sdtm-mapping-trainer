// The Clinical Study Data Reviewer's Guide (cSDRG), in the section layout of the PHUSE template:
// 1 Introduction (purpose, acronyms, standards and dictionaries, source data), 2 Protocol
// description (number and title, design, trial design datasets), 3 Subject data description
// (overview, annotated CRF, the subject domains with a note for each that needs one), 4 Data
// conformance summary (conformance inputs, and every issue not fixed with its explanation),
// 5 Appendix (inclusion and exclusion criteria). Facts come from the project; the learner writes
// the purpose, the source-data note and the domain notes, and explains the issues on the
// Validation tab. Checks say what a reviewer would miss.

import type { Built, StudyData } from './engine'
import { buildDefine } from './define'
import { crfPages, layoutAcrf } from './acrf'
import { TRIAL_DESIGN, domainInfo, isRel, relParent, customDomains } from './standards'
import { STUDY, PROTOCOL_FACTS, LAB_STANDARDS } from './study'
import { SDD_VERSION } from './dictdrug'
import { TRANSFERS } from './seed'
import { explanationOf, statusOf, type Issue, type ValidationRun } from './validation'
import type { Project } from './project'

export interface CsdrgNotes { purpose?: string; source?: string; design?: string; domains?: Record<string, string>; author?: string }
export interface CsdrgTable { head: string[]; rows: string[][]; widths: number[] }
export interface CsdrgSection { num: string; title: string; level: 1 | 2 | 3; paras: string[]; table?: CsdrgTable }
export interface CsdrgFinding { rule: string; sev: 'Error' | 'Warning'; where: string; msg: string }
export const CSDRG_RULES: Record<string, string> = {
  'CSD-001': 'Reject findings, findings that mean the mapping is wrong, and define.xml findings cannot be explained: fix them before the package goes out.',
  'CSD-002': 'Every Error not fixed needs an explanation in section 4.2: why the data are as they are, and what was done (query, confirmation, no change possible).',
  'CSD-003': 'Warnings not fixed should be explained too, so the reviewer does not have to guess.',
  'CSD-004': 'Section 4.1 gives the date and rule set of the validation run the issues come from: run validation under the rule set of the submission.',
  'CSD-005': 'A custom domain, or a dataset with supplemental qualifiers or non-standard variables, needs a note in section 3.3 saying what it holds and why.',
  'CSD-006': 'The appendix lists the inclusion and exclusion criteria from TI: build TI on the Trial design tab.',
}

const ACRONYMS: [string, string][] = [
  ['aCRF', 'Annotated case report form'], ['CDISC', 'Clinical Data Interchange Standards Consortium'], ['cSDRG', 'Clinical Study Data Reviewer’s Guide'], ['CT', 'Controlled terminology'],
  ['CTMS', 'Clinical trial management system'], ['EDC', 'Electronic data capture'], ['IRT', 'Interactive response technology'], ['ISO 8601', 'International standard for dates and times'],
  ['LLOQ', 'Lower limit of quantitation'], ['SDD', 'Study Drug Dictionary (fictional, for training)'], ['SDTM', 'Study Data Tabulation Model'], ['SDTMIG', 'SDTM Implementation Guide'],
  ['SI', 'International System of Units'], ['SMD', 'Study Medical Dictionary (fictional, for training)'], ['TEAE', 'Treatment-emergent adverse event'],
]
const USE: Record<string, string> = { AE: 'Safety', LB: 'Efficacy, safety', VS: 'Safety', CM: 'Safety', MH: 'Other', EX: 'Other', EC: 'Other', DS: 'Other', DM: 'Other', IE: 'Other', DV: 'Other', CO: 'Other', SV: 'Other', SE: 'Other', RELREC: 'Other' }

// Notes a domain usually needs, from what the project does: offered to the learner to edit.
export function suggestNotes(p: Project, all: Map<string, Built>): Record<string, string> {
  const out: Record<string, string> = {}
  const supp = (d: string) => (p.specs[d]?.supp ?? []).map((q) => `${q.qnam} (${q.qlabel})`).join(', ')
  const rel = p.version !== '4.0d' ? 'SUPP' : 'NS'
  for (const d of [...all.keys()].filter((k) => !isRel(k) && !TRIAL_DESIGN.includes(k))) {
    const parts: string[] = []
    if (d === 'DM') parts.push('All screened subjects are included; screen failures have no planned or actual arm and ARMNRS gives the reason. One subject was randomised but never dosed (ARMNRS ASSIGNED, NOT TREATED); one received the other arm’s kits for the whole study, so ACTARM differs from ARM.')
    if (d === 'AE') parts.push('Adverse events are coded with the Study Medical Dictionary (fictional, MedDRA-like) at the version in section 1.3. Treatment emergence is flagged relative to the first dose.')
    if (d === 'LB') parts.push(`Results come from the central laboratory. Standard results use the units of the laboratory standards table (${[...new Set(LAB_STANDARDS.map((x) => `${x.testcd} ${x.stdunit}`))].join(', ')}), converted from the reported unit when the laboratory reported another. Resent duplicate results were removed. At Week 12 glucose was drawn before and 2 hours after the dose (LBTPT). From Week 12 ALT was measured with a new assay with a different normal range.`)
    if (d === 'CM') parts.push('Medications are coded with the Study Drug Dictionary (fictional, WHODrug-like); CMTRT stays as reported.')
    if (d === 'EX') parts.push('EX holds the treatment actually taken, unblinded from the IRT kit assignment: GLV-12 at the daily dose in mg, or PLACEBO.')
    if (d === 'EC') parts.push('EC holds exposure as collected on the blinded CRF (GLV-12 OR PLACEBO, in tablets); EX gives the unblinded treatment.')
    if (d === 'CO') parts.push('Comments over 200 characters are split into COVAL, COVAL1 and so on at word boundaries.')
    if (d === 'RELREC') parts.push(`Relationships: ${(p.relrec ?? []).map((r) => r.label).join('; ')}.`)
    const c = customDomains().find((x) => x.code === d)
    if (c) parts.push(`Custom ${c.cls} domain (${c.name}). ${c.reason}`)
    const s = supp(d); if (s) parts.push(`${rel}${d} holds ${s}.`)
    if (parts.length) out[d] = parts.join(' ')
  }
  return out
}

export function needsNote(p: Project, d: string) { return !!p.specs[d]?.supp?.length || customDomains().some((c) => c.code === d) }

export interface Csdrg { sections: CsdrgSection[]; findings: CsdrgFinding[] }
export function buildCsdrg(p: Project, data: StudyData, all: Map<string, Built>, issues: Issue[], lastRun?: ValidationRun): Csdrg {
  const n = p.csdrg ?? {}
  const t = TRANSFERS[p.transfer ?? 1]
  const fact = (w: string) => PROTOCOL_FACTS.find((x) => x.what === w)?.value ?? ''
  const model = buildDefine({ builts: all, specs: p.specs, version: p.version, laid: layoutAcrf(crfPages(data.forms), p.acrf ?? {}), designDomains: TRIAL_DESIGN })
  const ig = p.version === '3.4' ? 'SDTMIG 3.4 (with SDTM 2.0)' : p.version === 'send' ? 'SENDIG 3.1.1' : 'SDTMIG 4.0 (draft, for training)'
  const S: CsdrgSection[] = []
  const sec = (num: string, title: string, paras: string[] = [], table?: CsdrgTable) => S.push({ num, title, level: num.split('.').length as 1 | 2 | 3, paras: paras.filter(Boolean), table })
  sec('1', 'Introduction')
  sec('1.1', 'Purpose', [`This guide describes the SDTM tabulation data of study ${STUDY.id} submitted with define.xml, the annotated CRF (acrf.pdf) and the datasets. It gives the information a reviewer needs that those files do not hold: how the data were collected and mapped, what to know about each domain, and the validation findings that remain with their explanations.`, n.purpose ?? ''])
  sec('1.2', 'Acronyms', [], { head: ['Acronym', 'Meaning'], rows: ACRONYMS.map(([a, b]) => [a, b]), widths: [0.25, 0.75] })
  const med = (p.transfer ?? 1) === 2 ? '1.1' : '1.0'
  sec('1.3', 'Study Data Standards and Dictionary Inventory', [], { head: ['Standard or dictionary', 'Version', 'Used for'], widths: [0.4, 0.3, 0.3], rows: [
    ['SDTM / SDTMIG', ig, 'Tabulation datasets'], ['CDISC controlled terminology', model.standards.find((s) => s.type === 'CT')?.version ?? 'bundled', 'Coded values'],
    ['Define-XML', '2.1', 'Metadata (define.xml)'], ['Study Medical Dictionary (fictional)', med, 'AE, MH'], ['Study Drug Dictionary (fictional)', SDD_VERSION, 'CM'],
  ] })
  sec('1.4', 'Source Data Used for Dataset Creation', [`The datasets were created from ${t.label.toLowerCase()} (${t.date}): ${t.note} Sources: the EDC (CRF data), the central laboratory transfer (LB), the IRT randomisation and kit file (DM arms, EX), and the monitors’ protocol deviation log in the CTMS (DV).`, n.source ?? ''])
  sec('2', 'Protocol Description')
  sec('2.1', 'Protocol Number and Title', [`Protocol ${STUDY.id}: ${STUDY.title}.`])
  sec('2.2', 'Protocol Design', [`${STUDY.design}. ${fact('Primary objective')}. Primary outcome measure: ${fact('Primary outcome measure')}. ${STUDY.planned} subjects planned at five sites.`, n.design ?? ''])
  const td = TRIAL_DESIGN.filter((d) => all.has(d))
  sec('2.3', 'Trial Design Datasets', [td.length ? `Submitted: ${td.map((d) => `${d} (${all.get(d)!.rows.length} records)`).join(', ')}. SE is derived from DM and the trial design.` : 'No trial design datasets yet.', TRIAL_DESIGN.filter((d) => !all.has(d)).length ? `Not submitted: ${TRIAL_DESIGN.filter((d) => !all.has(d)).join(', ')}.` : ''])
  sec('3', 'Subject Data Description')
  const dm = all.get('DM')
  sec('3.1', 'Overview', [dm ? `DM holds ${dm.rows.length} subjects, screen failures included; ${dm.rows.filter((r) => r.ARMCD).length} were randomised.` : 'DM is not mapped yet.', 'Dates are ISO 8601; partial dates stay partial and study days are null for them.'])
  const annotated = Object.values(p.acrf ?? {}).filter((f) => Object.values(f).some(Boolean)).length
  sec('3.2', 'Annotated CRFs', [`acrf.pdf annotates each unique CRF page once (${annotated} of ${crfPages(data.forms).length} pages annotated), with the SDTM variable each field is submitted in, the domain at the top of each page, and bookmarks by form and by visit. Fields collected but not submitted are marked [NOT SUBMITTED].`])
  const subj = model.datasets.filter((d) => !TRIAL_DESIGN.includes(d.name))
  sec('3.3', 'SDTM Subject Domains', [], { head: ['Dataset', 'Label', 'Class', 'Records', 'Use', 'Note'], widths: [0.12, 0.3, 0.2, 0.1, 0.16, 0.12], rows: subj.map((d) => [d.name, d.label, d.cls, String(d.records), isRel(d.name) ? `See ${relParent(d.name)}` : USE[d.name] ?? 'Other', n.domains?.[d.name]?.trim() ? `3.3.${d.name}` : '']) })
  for (const d of subj.filter((x) => n.domains?.[x.name]?.trim())) sec(`3.3.${d.name}`, `${d.name} · ${domainInfo(d.name)?.name ?? d.label}`, [n.domains![d.name].trim()])
  sec('4', 'Data Conformance Summary')
  sec('4.1', 'Conformance Inputs', [lastRun ? `Validated on ${lastRun.utc.slice(0, 10)} with the trainer’s conformance checks under the ${lastRun.ruleSet} rule set (modelled on the ${lastRun.ruleSet === 'CDISC' ? 'CDISC SDTMIG conformance rules' : `${lastRun.ruleSet} validation rules`}), on ${all.size} datasets and define.xml (Define-XML 2.1 checks). Findings: ${lastRun.reject} Reject, ${lastRun.error} Error, ${lastRun.warning} Warning.` : 'No validation run recorded yet: run validation on the Validation tab.', 'The controlled terminology, dictionaries and define.xml version are those of section 1.3.'])
  sec('4.2', 'Issues Summary', [issues.length ? 'Every finding not fixed, with the reason the data are as they are.' : 'Validation raised no findings.'], issues.length ? { head: ['Check', 'Message', 'Severity', 'Dataset', 'Count', 'Explanation'], widths: [0.1, 0.27, 0.09, 0.1, 0.07, 0.37], rows: issues.map((i) => [i.rule, `${i.check}${i.variable ? ` (${i.variable})` : ''}`, i.sev, i.dataset, String(i.count), statusOf(i, p) === 'Must fix' ? 'MUST BE FIXED: cannot be explained' : explanationOf(p, i.key)?.text ?? 'NOT EXPLAINED']) } : undefined)
  sec('5', 'Appendix')
  const ti = p.design.TI ?? []
  sec('5.1', 'Inclusion and Exclusion Criteria', [ti.length ? 'From TI.' : 'TI is not built yet.'], ti.length ? { head: ['IETESTCD', 'Category', 'Criterion'], widths: [0.15, 0.15, 0.7], rows: ti.map((r) => [r.IETESTCD ?? '', r.IECAT ?? '', r.IETEST ?? '']) } : undefined)

  const F: CsdrgFinding[] = []
  for (const i of issues) {
    const st = statusOf(i, p)
    if (st === 'Must fix') F.push({ rule: 'CSD-001', sev: 'Error', where: `${i.dataset} ${i.rule}`, msg: `${i.rule} ${i.variable} in ${i.dataset} (${i.sev}) must be fixed` })
    else if (st === 'Open') F.push({ rule: i.sev === 'Warning' ? 'CSD-003' : 'CSD-002', sev: i.sev === 'Warning' ? 'Warning' : 'Error', where: `${i.dataset} ${i.rule}`, msg: `${i.rule} ${i.variable} in ${i.dataset} is not explained` })
  }
  if (!lastRun || lastRun.ruleSet !== p.ruleSet) F.push({ rule: 'CSD-004', sev: 'Warning', where: '4.1', msg: lastRun ? `The last run used the ${lastRun.ruleSet} rule set; the project uses ${p.ruleSet}` : 'No validation run recorded' })
  for (const d of [...all.keys()].filter((k) => !isRel(k) && needsNote(p, k) && !n.domains?.[k]?.trim())) F.push({ rule: 'CSD-005', sev: 'Warning', where: `3.3 ${d}`, msg: `${d} needs a domain note` })
  if (!p.imported && !ti.length) F.push({ rule: 'CSD-006', sev: 'Warning', where: '5.1', msg: 'No inclusion and exclusion criteria: TI is missing' })
  return { sections: S, findings: F }
}
