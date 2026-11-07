// The annotated CRF. Each unique CRF page is annotated once: every field gets the SDTM variable
// it is submitted in, in the standard syntax (the CDISC Metadata Submission Guidelines and the
// common aCRF practice): a domain header at the top left of the page; the variable name alone
// when the page feeds one domain, DOMAIN.VARIABLE when it feeds several; findings as
// “VSORRES when VSTESTCD = SYSBP”; supplemental qualifiers as “QVAL when QNAM = X in SUPPAE”;
// fields collected but not submitted as “[NOT SUBMITTED]”; link fields as “RELREC”.

import type { DomainSpec } from './engine'
import type { RelDef } from './relrec'
import { ruleFields } from './plan'
import { varsOf, domainInfo, type Version } from './standards'
import { FORM_INFO, RAW_FIELDS, type Row } from './seed'
import { VISITS } from './study'

export const NOT_SUBMITTED = '[NOT SUBMITTED]'
export interface CrfPage { form: string; title: string; visits: string[]; fields: { name: string; label: string; options: string[]; date: boolean }[] }

// The EDC forms are the CRF; vendor files (lab, IRT, CTMS log) are not on it.
export const VISIT_ORDER = [...VISITS.map((v) => v.raw), 'Unscheduled', 'End of study', 'Log (any visit)']
export function crfPages(forms: Record<string, Row[]>): CrfPage[] {
  return Object.keys(FORM_INFO).filter((f) => FORM_INFO[f].source === 'EDC').map((form) => {
    const rows = forms[form] ?? []
    const visits = rows.some((r) => r.VISIT) ? [...new Set(rows.map((r) => r.VISIT).filter(Boolean))].sort((a, b) => VISIT_ORDER.indexOf(a) - VISIT_ORDER.indexOf(b)) : ['DM', 'IC', 'IE', 'MH'].includes(form) ? ['Screening'] : form === 'DS' ? ['End of study'] : ['Log (any visit)']
    const fields = (RAW_FIELDS[form] ?? []).filter((f) => f.name !== 'SITEID' && !/^(AE|MH)(LLT|LLTCD|DECOD|PTCD|HLT|HLTCD|HLGT|HLGTCD|SOC|SOCCD|BODSYS|SOCCD)$/.test(f.name) && !/^CM(DECOD|DRN|CLAS|CLASCD)$/.test(f.name)).map((f) => {
      const vals = [...new Set(rows.map((r) => r[f.name]).filter(Boolean))]
      const date = /DAT$/.test(f.name)
      return { name: f.name, label: f.label, date, options: !date && vals.length > 0 && vals.length <= 6 && vals.every((v) => v.length < 40 && !/^\d/.test(v)) ? vals.sort() : [] }
    })
    return { form, title: FORM_INFO[form].name, visits, fields }
  })
}

// An aCRF shows where collected data go, so variables derived from a field (standard results,
// study days, AGE, VISITNUM, EPOCH, flags) are not annotated on it.
const DERIVED = /(STRESC|STRESN|STRESU|STNRLO|STNRHI|STDY|ENDY|LOBXFL|BLFL|NRIND|SEQ)$|^(AGE|VISITNUM|EPOCH|[A-Z]{2}DY)$/
const annotatable = (v: string) => !DERIVED.test(v)

// Domains a form feeds, from the mapping.
export function domainsOf(form: string, specs: Record<string, DomainSpec>): string[] {
  return Object.keys(specs).filter((d) => specs[d].vars.length && (specs[d].source === form || (specs[d].parts ?? []).some((p) => p.source === form))).sort()
}

// The annotation the mapping implies for each field of a page.
export function suggest(form: string, specs: Record<string, DomainSpec>, relrec: RelDef[], ver: Version): Record<string, string> {
  const doms = domainsOf(form, specs)
  const multi = doms.length > 1
  const out: Record<string, string[]> = {}
  const push = (f: string, a: string) => { (out[f] ??= []).includes(a) || out[f].push(a) }
  for (const d of doms) {
    const s = specs[d]
    for (const part of [{ source: s.source, rules: s.rules, transpose: s.transpose, supp: s.supp }, ...(s.parts ?? [])]) {
      if (part.source !== form) continue
      const name = (v: string) => (multi ? `${d}.${v}` : v)
      for (const v of s.vars) {
        const r = part.rules[v]; if (!r || r.kind === 'seq' || r.kind === 'const') continue
        if (!annotatable(v)) continue
        const fields = ruleFields(r)
        const tp = part.transpose
        if (tp && (fields.has('__RESULT') || fields.has('__UNIT'))) {
          for (const t of tp.tests) {
            if (fields.has('__RESULT')) push(t.field, `${name(v)} when ${d}TESTCD = ${t.code}`)
            if (fields.has('__UNIT') && t.unitField) push(t.unitField, `${name(v)} when ${d}TESTCD = ${t.code}`)
          }
        }
        for (const f of fields) if (!f.startsWith('__') && !f.includes('.')) push(f, name(v))
      }
      for (const q of part.supp ?? []) for (const f of ruleFields({ kind: 'expr', expr: q.expr })) if (!f.startsWith('__') && !f.includes('.')) push(f, `QVAL when QNAM = ${q.qnam} in ${ver === '3.4' ? 'SUPP' : 'NS'}${d}`)
    }
  }
  // Fields another domain reads through a look-up (subj('IC', 'DSSTDAT') for RFICDTC in DM).
  for (const [d, s] of Object.entries(specs)) for (const part of [s, ...(s.parts ?? [])]) for (const v of s.vars) {
    const r = part.rules[v]; if (!r) continue
    if (!v.endsWith('DTC')) continue
    for (const f of ruleFields(r)) { const [fm, fld] = f.split('.'); if (fld && fm === form) push(fld, `${d}.${v}`) }
  }
  for (const r of relrec) for (const side of [r.a, r.b]) if (doms.includes(side.domain)) {
    const s = specs[side.domain]
    if (!s.vars.includes(side.key)) push(side.key, 'RELREC')
  }
  const page = crfPages({}).find((p) => p.form === form)
  const res: Record<string, string> = {}
  for (const f of page?.fields ?? []) res[f.name] = out[f.name]?.join('; ') ?? NOT_SUBMITTED
  return res
}

// The variables an annotation names, with their domain.
export function namedVars(text: string, header: string[]): { domain: string; variable: string }[] {
  const out: { domain: string; variable: string }[] = []
  for (const part of text.split(';')) {
    const t = part.trim(); if (!t || t === NOT_SUBMITTED || t === 'RELREC') continue
    const supp = /QVAL when QNAM = ([A-Z0-9]+) in (SUPP|NS)([A-Z]{2})/.exec(t)
    if (supp) { out.push({ domain: `${supp[2]}${supp[3]}`, variable: supp[1] }); continue }
    const m = /^([A-Z]{2,8})(?:\.([A-Z0-9]{1,8}))?/.exec(t); if (!m) { out.push({ domain: '', variable: t }); continue }
    if (m[2]) out.push({ domain: m[1], variable: m[2] })
    else out.push({ domain: header.find((d) => varsOf(d, '3.4').some((v) => v.name === m[1])) ?? header[0] ?? '', variable: m[1] })
  }
  return out
}

export interface AcrfFinding { form: string; field: string; msg: string; sev: 'Error' | 'Warning' }
// Every field annotated, every variable real, every annotation matching the mapping.
export function checkAcrf(pages: CrfPage[], notes: Record<string, Record<string, string>>, specs: Record<string, DomainSpec>, relrec: RelDef[], ver: Version): AcrfFinding[] {
  const out: AcrfFinding[] = []
  for (const pg of pages) {
    const doms = domainsOf(pg.form, specs)
    const implied = suggest(pg.form, specs, relrec, ver)
    for (const f of pg.fields) {
      const a = (notes[pg.form]?.[f.name] ?? '').trim()
      if (!a) { out.push({ form: pg.form, field: f.name, msg: 'Not annotated: give the variable, or [NOT SUBMITTED]', sev: 'Error' }); continue }
      if (a === NOT_SUBMITTED) { if (implied[f.name] !== NOT_SUBMITTED) out.push({ form: pg.form, field: f.name, msg: `Marked not submitted, but the mapping uses it: ${implied[f.name]}`, sev: 'Error' }); continue }
      for (const nv of namedVars(a, doms)) {
        const known = nv.domain && (nv.domain.startsWith('SUPP') || nv.domain.startsWith('NS') ? true : varsOf(nv.domain, ver).some((v) => v.name === nv.variable))
        if (!known) out.push({ form: pg.form, field: f.name, msg: `“${nv.variable}” is not a variable of ${nv.domain || 'any domain on this page'}`, sev: 'Error' })
        else if (!implied[f.name].includes(nv.variable)) out.push({ form: pg.form, field: f.name, msg: `Annotated ${nv.variable}, but the mapping does not put this field there (${implied[f.name]})`, sev: 'Warning' })
      }
    }
  }
  return out
}

// One colour per domain on a page, in the order of the header (the convention most sponsors use).
export const DOMAIN_COLOURS = ['#BFDBFE', '#FDE68A', '#BBF7D0', '#FBCFE8', '#DDD6FE']
export const headerOf = (form: string, specs: Record<string, DomainSpec>) => domainsOf(form, specs).map((d) => `${d} (${domainInfo(d)?.name ?? d})`)
