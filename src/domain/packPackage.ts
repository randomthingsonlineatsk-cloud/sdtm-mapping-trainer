// The submission package of a specialist study (every study but GLV-12-301, which has its own,
// richer package). A nonclinical study goes in eCTD module 4 (m4/datasets/<study>/tabulations/send/)
// with a nonclinical reviewer's guide (nSDRG); a clinical one in module 5 (…/tabulations/sdtm/) with
// a clinical one (cSDRG). Each holds one .xpt per dataset, define.xml with its stylesheet and the
// guide. The checks include those of FDA's technical rejection criteria for study data that the
// trainer can model: a TS dataset with the study start date (STSTDTC for SEND, SSTDTC for SDTM)
// and DM, and define.xml. For the clinical specialist studies the trainer builds TS from the
// protocol itself (the trial design work is practised on GLV-12-301); for the SEND study TS is
// mapped by the learner from the study plan.

import type { Built, StudyData } from './engine'
import { toXpt } from './exports'
import { allDatasets } from './datasets'
import { designBuilt, type DesignRow } from './design'
import { buildDefine, checkDefine, type DefineModel } from './define'
import { packageFindings, toIssues, statusOf, explanationOf, type Issue, type ValidationRun } from './validation'
import { CT_INFO, VERSION_LABEL, domainInfo, isRel, relParent, decode } from './standards'
import { packOf, type Project } from './project'
import type { StudyPack } from './studypack'
import type { Csdrg, CsdrgSection, CsdrgFinding } from './csdrg'

export const isSendPack = (pack: StudyPack) => pack.standard === 'send'
export const packFolder = (pack: StudyPack) => `${isSendPack(pack) ? 'm4' : 'm5'}/datasets/${pack.id.toLowerCase()}/tabulations/${isSendPack(pack) ? 'send' : 'sdtm'}/`
export const guideName = (pack: StudyPack) => (isSendPack(pack) ? 'nsdrg.pdf' : 'csdrg.pdf')
export const guideTitle = (pack: StudyPack) => (isSendPack(pack) ? "Nonclinical Study Data Reviewer's Guide" : "Clinical Study Data Reviewer's Guide")
export const PACK_RULES: Record<string, string> = {
  'TRC-TS': 'FDA’s technical rejection criteria: a study data package needs ts.xpt with the study start date (STSTDTC in SEND, SSTDTC in SDTM). Map TS (SEND) or build it from the protocol.',
  'TRC-DM': 'The package needs dm.xpt: map DM.',
  'TRC-DEF': 'Every dataset is described in define.xml: fix its findings on the Validation tab.',
  'PKG-001': 'Findings that must be fixed (Reject, mapping errors) remain: fix them on the Validation tab.',
  'PKG-002': 'Issues not fixed need an explanation in the reviewer’s guide: explain them on the Validation tab.',
  'PKG-003': 'The transport file breaks the XPT version 5 limits: fix the values in the mapping.',
  'PKG-004': 'A dataset the agency expects for this kind of study is missing.',
  'PKG-ACRF': 'Annotate the CRF in a real submission; in the trainer the aCRF is practised on GLV-12-301.',
  'PKG-007': 'Run validation under the rule set of the submission after the last change.',
}

// TS for a clinical specialist study, from its protocol facts and raw data.
const TPHASE: Record<string, string> = { 'Phase 1': 'PHASE I TRIAL', 'Phase 2': 'PHASE II TRIAL', 'Phase 3': 'PHASE III TRIAL' }
export function clinicalTs(pack: StudyPack, data: StudyData, p: Project): Built {
  const f = data.forms
  const enrolled = new Set((f.IRT ?? []).map((r) => r.SUBJID))
  const consent = (f.IC ?? []).filter((r) => enrolled.has(r.SUBJID)).map((r) => toIsoDate(r.ICDAT)).filter(Boolean).sort()[0] ?? ''
  // A value over 200 characters continues in TSVAL1, TSVAL2… (the XPT limit), split between words.
  const row = (cd: string, val: string): DesignRow => {
    const parts: string[] = []; let rest = val
    while (rest.length > 200) { const cut = rest.lastIndexOf(' ', 200); parts.push(rest.slice(0, cut)); rest = rest.slice(cut + 1) }
    parts.push(rest)
    return { STUDYID: pack.id, DOMAIN: 'TS', TSPARMCD: cd, TSPARM: decode('TSPARMCD', cd) || cd, TSVAL: parts[0], ...Object.fromEntries(parts.slice(1).map((x, i) => [`TSVAL${i + 1}`, x])) }
  }
  const rows: DesignRow[] = [
    row('TITLE', pack.title), row('TPHASE', TPHASE[pack.phase] ?? ''), row('INDIC', pack.indication), row('SPONSOR', pack.sponsor.replace(/ \(fictional\)$/, '')),
    row('SSTDTC', consent), row('ACTSUB', String(enrolled.size)), row('RANDOM', 'Y'), row('NARMS', String(pack.arms.length)),
    ...[...new Set(pack.sites.map((s) => s.iso))].map((c) => row('FCNTRY', c)),
    row('SDTMVER', p.version === '3.4' ? '2.0' : '3.0'), row('SDTIGVER', p.version === '3.4' ? '3.4' : '4.0'),
  ]
  return designBuilt('TS', rows, p.version)
}
function toIsoDate(edc: string): string {
  const m = /^(\d{2})-([A-Z]{3})-(\d{4})$/i.exec(edc ?? ''); if (!m) return ''
  const mon = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].indexOf(m[2].toUpperCase()) + 1
  return mon ? `${m[3]}-${String(mon).padStart(2, '0')}-${m[1]}` : ''
}

export interface PackPlan { pack: StudyPack; all: Map<string, Built>; issues: Issue[]; findings: CsdrgFinding[]; define: DefineModel; tsBuiltByTrainer: boolean }
export function planPackPackage(p: Project, data: StudyData): PackPlan {
  const pack = packOf(p)!
  const all = allDatasets(p, data)
  let tsBuiltByTrainer = false
  if (!isSendPack(pack) && !all.has('TS')) { all.set('TS', clinicalTs(pack, data, p)); tsBuiltByTrainer = true }
  const define = defineFor(p, pack, all)
  // The clinical specialist studies have no aCRF in the trainer: define.xml's CRF page references
  // (DEF-001) are not checked for them, and the package says what a real one would add.
  const defs = checkDefine(define, all).filter((f) => isSendPack(pack) || f.rule !== 'DEF-001')
  const issues = toIssues([...packageFindings(p, data, new Map([...all].filter(([k]) => k !== 'TS' || !tsBuiltByTrainer))), ...defs.map((f) => ({ rule: f.rule, sev: f.sev, domain: 'define.xml', variable: f.where, msg: f.msg }))])
  const F: CsdrgFinding[] = []
  if (!isSendPack(pack)) F.push({ rule: 'PKG-ACRF', sev: 'Warning', where: 'acrf.pdf', msg: 'No annotated CRF in this training package (practised on GLV-12-301); a real module 5 package needs acrf.pdf and define.xml page references to it' })
  const ts = all.get('TS'), start = isSendPack(pack) ? 'STSTDTC' : 'SSTDTC'
  if (!ts) F.push({ rule: 'TRC-TS', sev: 'Error', where: 'ts.xpt', msg: 'No TS dataset' })
  else if (!ts.rows.some((r) => r.TSPARMCD === start && /^\d{4}-\d{2}-\d{2}/.test(r.TSVAL ?? ''))) F.push({ rule: 'TRC-TS', sev: 'Error', where: 'ts.xpt', msg: `No ${start} with an ISO 8601 date` })
  if (!all.has('DM')) F.push({ rule: 'TRC-DM', sev: 'Error', where: 'dm.xpt', msg: 'No DM' })
  if (isSendPack(pack) && !all.has('TX')) F.push({ rule: 'PKG-004', sev: 'Error', where: 'tx.xpt', msg: 'No TX: SEND studies describe their sets of animals in TX' })
  const must = issues.filter((i) => statusOf(i, p) === 'Must fix'), open = issues.filter((i) => statusOf(i, p) === 'Open')
  if (must.length) F.push({ rule: 'PKG-001', sev: 'Error', where: 'Validation', msg: `${must.length} issue${must.length === 1 ? '' : 's'} must be fixed: ${must.slice(0, 4).map((i) => `${i.dataset} ${i.rule} ${i.variable}`).join(', ')}` })
  const openE = open.filter((i) => i.sev !== 'Warning'), openW = open.filter((i) => i.sev === 'Warning')
  if (openE.length) F.push({ rule: 'PKG-002', sev: 'Error', where: 'Validation', msg: `${openE.length} Error issue${openE.length === 1 ? '' : 's'} neither fixed nor explained` })
  if (openW.length) F.push({ rule: 'PKG-002', sev: 'Warning', where: 'Validation', msg: `${openW.length} Warning issue${openW.length === 1 ? '' : 's'} not explained` })
  for (const [name, b] of all) { const w = toXpt(b, p.version).report.warnings; if (w.length) F.push({ rule: 'PKG-003', sev: 'Error', where: `${name.toLowerCase()}.xpt`, msg: w.slice(0, 2).join('; ') }) }
  if (issues.some((i) => i.dataset === 'define.xml')) F.push({ rule: 'TRC-DEF', sev: 'Error', where: 'define.xml', msg: 'define.xml has findings' })
  const last = (p.validation ?? []).at(-1)
  const now = issues.filter((i) => i.dataset !== 'define.xml').map((i) => i.key).sort().join('\n')
  if (!last || last.ruleSet !== p.ruleSet || [...last.keys].filter((k) => !k.startsWith('define.xml')).sort().join('\n') !== now) F.push({ rule: 'PKG-007', sev: 'Warning', where: 'Validation', msg: last ? 'The last validation run does not match the package as it is now' : 'No validation run recorded' })
  return { pack, all, issues, findings: F, define, tsBuiltByTrainer }
}

function defineFor(p: Project, pack: StudyPack, all: Map<string, Built>): DefineModel {
  // Define-XML origin sources: Investigator (the eCRF), Subject (a device the participant uses), Vendor (laboratories, test facilities, IRT, diaries' vendors).
  const formSource = Object.fromEntries(Object.entries(pack.formInfo).map(([k, v]) => [k, v.source === 'EDC' ? 'Investigator' : v.source === 'Device' ? 'Subject' : 'Vendor']))
  const m = buildDefine({ builts: all, specs: p.specs, version: p.version, laid: [], designDomains: isSendPack(pack) ? [] : ['TS'], study: { id: pack.id, title: pack.title }, rawFields: pack.rawFields, formSource })
  m.leaves = [{ id: 'LF.guide', href: guideName(pack), title: guideTitle(pack) }, ...m.leaves.filter((l) => l.id !== 'LF.acrf' && l.id !== 'LF.csdrg')]
  return m
}

// The reviewer's guide: nSDRG or cSDRG, in the sections of the PHUSE templates, filled from the
// study, the datasets and the learner's explanations on the Validation tab.
export function buildPackGuide(p: Project, plan: PackPlan, lastRun?: ValidationRun): Csdrg {
  const { pack, all, issues } = plan
  const send = isSendPack(pack)
  const S: CsdrgSection[] = []
  const sec = (num: string, title: string, paras: string[] = [], table?: CsdrgSection['table']) => S.push({ num, title, level: num.split('.').length as 1 | 2 | 3, paras: paras.filter(Boolean), table })
  const n = p.csdrg ?? {}
  sec('1', 'Introduction')
  sec('1.1', 'Purpose', [`This guide describes the ${send ? 'SEND' : 'SDTM'} datasets of study ${pack.id} submitted with define.xml. It gives a reviewer what those files do not hold: how the data were collected and mapped, what to know about each dataset, and the validation findings that remain with their explanations.`, n.purpose ?? ''])
  sec('1.2', 'Study Data Standards and Terminology', [], { head: ['Standard or terminology', 'Version', 'Used for'], widths: [0.4, 0.3, 0.3], rows: [
    [send ? 'SENDIG' : 'SDTM / SDTMIG', VERSION_LABEL[p.version], 'Datasets'], ['CDISC controlled terminology', CT_INFO.label, 'Coded values'], ['Define-XML', '2.1', 'Metadata (define.xml)'],
  ] })
  sec('2', send ? 'Study Design' : 'Protocol Description')
  sec('2.1', send ? 'Study Title and Number' : 'Protocol Number and Title', [`${pack.id}: ${pack.title}.`])
  sec('2.2', send ? 'Summary of Study Design' : 'Protocol Design', [`${pack.design}.`, ...pack.facts.map((f) => `${f.what}: ${f.value}.`)])
  sec('2.3', 'Trial Design Datasets', [send ? `Trial sets are in TX (${all.get('TX')?.rows.length ?? 0} records); the study plan summary is in TS.` : `TS is built from the protocol${plan.tsBuiltByTrainer ? ' by the trainer' : ''}. TA, TE, TV and TI are not part of this training package (they are practised on GLV-12-301).`])
  sec('3', send ? 'Description of Study Datasets' : 'Subject Data Description')
  const subj = plan.define.datasets.filter((d) => !['TS', 'TX'].includes(d.name))
  sec('3.1', 'Overview', [], { head: ['Dataset', 'Label', 'Records', 'Note'], widths: [0.15, 0.45, 0.12, 0.28], rows: subj.map((d) => [d.name, d.label, String(d.records), isRel(d.name) ? `See ${relParent(d.name)}` : n.domains?.[d.name]?.trim() ? `3.2.${d.name}` : '']) })
  sec('3.2', 'Study Conventions', pack.conventions.map((c) => `${c.topic}: ${c.rule}`))
  for (const d of subj.filter((x) => n.domains?.[x.name]?.trim())) sec(`3.2.${d.name}`, `${d.name} · ${domainInfo(d.name, p.version)?.name ?? d.label}`, [n.domains![d.name].trim()])
  if (send) sec('3.3', 'Differences between the Study Report and the Datasets', ['The datasets were produced from the test facility’s data before the final study report; any difference found at report finalisation is listed here. None is known for this training package.'])
  sec('4', 'Data Standards Conformance Summary')
  sec('4.1', 'Conformance Inputs', [lastRun ? `Validated on ${lastRun.utc.slice(0, 10)} with the trainer’s conformance checks under the ${lastRun.ruleSet} rule set. Findings: ${lastRun.reject} Reject, ${lastRun.error} Error, ${lastRun.warning} Warning.` : 'No validation run recorded yet.'])
  sec('4.2', 'Issues Summary', [issues.length ? 'Every finding not fixed, with the reason the data are as they are.' : 'Validation raised no findings.'], issues.length ? { head: ['Check', 'Message', 'Severity', 'Dataset', 'Count', 'Explanation'], widths: [0.1, 0.27, 0.09, 0.1, 0.07, 0.37], rows: issues.map((i) => [i.rule, `${i.check}${i.variable ? ` (${i.variable})` : ''}`, i.sev, i.dataset, String(i.count), statusOf(i, p) === 'Must fix' ? 'MUST BE FIXED: cannot be explained' : explanationOf(p, i.key)?.text ?? 'NOT EXPLAINED']) } : undefined)
  return { sections: S, findings: plan.findings }
}

// Mission scoring for a specialist study's package (S41): the study's datasets count 60%, the
// package 40% (each kind of package error costs 25 points, each kind of warning 5).
export function packageScore(plan: PackPlan): { score: number; errors: CsdrgFinding[] } {
  const errors = plan.findings.filter((f) => f.sev === 'Error')
  const kinds = (sev: string) => new Set(plan.findings.filter((f) => f.sev === sev).map((f) => f.rule)).size
  return { score: Math.max(0, 100 - 25 * kinds('Error') - 5 * kinds('Warning')), errors }
}
