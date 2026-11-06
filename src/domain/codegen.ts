// A read-only R and SAS view of a mapping (decision D3): each rule translated into the shape a
// clinical programmer would write it, so a learner sees how the visual mapping becomes code.
// Cross-dataset look-ups (first dose date, IRT arm, reference DM) become calls to study helper
// functions, named the same in R and SAS (in SAS, PROC FCMP functions or hash look-ups in a
// study macro library). It is a sketch for reading, not a validated program.

import { parse, type Node } from './expr'
import { evalOrder, type DomainSpec, type Part, type Rule } from './engine'
import { STUDY } from './study'

type Lang = 'R' | 'SAS'
const PSEUDO_R: Record<string, string> = { __TESTCD: '.testcd', __RESULT: '.result', __UNIT: '.unit', __FIELD: '.field' }
const HELPERS: Record<string, string> = {
  iso: 'iso8601', subj: 'subj_value', subjwhere: 'subj_value_where', irt: 'irt_value', country: 'site_country', armname: 'arm_name', age: 'age_years', dm: 'dm_value',
  studyday: 'study_day', epoch: 'epoch_of', visitnum: 'visit_num', visitname: 'visit_name', visitdy: 'visit_day', planned: 'is_planned', convert: 'convert_unit',
  stdunit: 'std_unit', ctdecode: 'ct_decode', inct: 'in_ct', lab: 'lab_std',
}
const SUBJ_ARG = new Set(['subj', 'subjwhere', 'irt', 'dm', 'epoch', 'visitnum', 'visitname'])

function expr(n: Node, L: Lang): string {
  const go = (x: Node) => expr(x, L)
  switch (n.k) {
    case 'lit':
      if (typeof n.v === 'number') return String(n.v)
      if (typeof n.v === 'boolean') return L === 'R' ? (n.v ? 'TRUE' : 'FALSE') : n.v ? '1' : '0'
      return L === 'R' ? JSON.stringify(n.v ?? '') : `'${String(n.v ?? '').replace(/'/g, "''")}'`
    case 'var': return L === 'R' ? PSEUDO_R[n.name] ?? n.name : n.name
    case 'un': return n.op === 'not' ? (L === 'R' ? `!(${go(n.a)})` : `not (${go(n.a)})`) : `-(${go(n.a)})`
    case 'bin': {
      const op = n.op === 'and' ? (L === 'R' ? '&' : 'and') : n.op === 'or' ? (L === 'R' ? '|' : 'or') : n.op === '=' ? (L === 'R' ? '==' : '=') : n.op === '!=' ? (L === 'R' ? '!=' : '^=') : n.op
      return `${go(n.a)} ${op} ${go(n.b)}`
    }
    case 'call': {
      const f = n.name.toLowerCase(), a = n.args.map(go)
      if (f === '__in') return L === 'R' ? `${a[0]} %in% c(${a.slice(1).join(', ')})` : `${a[0]} in (${a.slice(1).join(', ')})`
      if (f === 'isdup') return L === 'R' ? `duplicated(paste(${a.join(', ')}))` : `(first_key_seen(catx('|', ${a.join(', ')})) = 0)`
      if (HELPERS[f]) {
        const extra = SUBJ_ARG.has(f) ? ['SUBJID'] : []
        const args = f === 'subj' || f === 'subjwhere' ? [L === 'R' ? `raw$${String((n.args[0] as { v?: unknown }).v ?? '').toLowerCase()}` : `'${String((n.args[0] as { v?: unknown }).v ?? '')}'`, ...a.slice(1)] : a
        if (f === 'studyday' && a.length === 1) args.push(L === 'R' ? 'dm_value("RFSTDTC", SUBJID)' : "dm_value('RFSTDTC', SUBJID)")
        if (f === 'planned') args.unshift('VISIT')
        return `${HELPERS[f]}(${[...args, ...extra].join(', ')})`
      }
      const R: Record<string, string> = { concat: `paste0(${a.join(', ')})`, if: `if_else(${a.join(', ')})`, coalesce: `coalesce(${a.join(', ')})`, upper: `toupper(${a[0]})`, lower: `tolower(${a[0]})`, trim: `trimws(${a[0]})`, substr: `substr(${a[0]}, ${a[1]}, ${a[1]} + ${a[2]} - 1)`, replace: `gsub(${a[1]}, ${a[2]}, ${a[0]}, fixed = TRUE)`, present: `!is_blank(${a[0]})`, isblank: `is_blank(${a[0]})`, contains: `grepl(${a[1]}, ${a[0]}, fixed = TRUE)`, num: `as.numeric(${a[0]})`, str: `as.character(${a[0]})`, round: `round(${a.join(', ')})`, min: `pmin(${a.join(', ')}, na.rm = TRUE)`, max: `pmax(${a.join(', ')}, na.rm = TRUE)`, len: `nchar(${a[0]})` }
      const numeric = (x: Node) => x.k === 'lit' && typeof x.v === 'number'
      const SAS: Record<string, string> = { concat: `cats(${a.join(', ')})`, if: `${n.args.slice(1).every(numeric) ? 'ifn' : 'ifc'}(${a.join(', ')})`, coalesce: `coalescec(${a.join(', ')})`, upper: `upcase(${a[0]})`, lower: `lowcase(${a[0]})`, trim: `strip(${a[0]})`, substr: `substr(${a.join(', ')})`, replace: `tranwrd(${a.join(', ')})`, present: `not missing(${a[0]})`, isblank: `missing(${a[0]})`, contains: `index(${a[0]}, ${a[1]}) > 0`, num: `input(${a[0]}, ?? best32.)`, str: `strip(put(${a[0]}, best32.))`, round: `round(${a[0]}, ${a[1] !== undefined ? `10**(-${a[1]})` : '1'})`, min: `min(${a.join(', ')})`, max: `max(${a.join(', ')})`, len: `length(${a[0]})` }
      return (L === 'R' ? R : SAS)[f] ?? `${f}(${a.join(', ')})`
    }
  }
}
export function ruleCode(r: Rule | undefined, L: Lang): string {
  if (!r) return L === 'R' ? 'NA_character_' : "''"
  if (r.kind === 'const') return L === 'R' ? (r.value === '' ? 'NA_character_' : JSON.stringify(r.value)) : `'${r.value.replace(/'/g, "''")}'`
  if (r.kind === 'copy') return L === 'R' ? PSEUDO_R[r.field] ?? r.field : r.field
  if (r.kind === 'recode') {
    const f = L === 'R' ? PSEUDO_R[r.field] ?? r.field : r.field
    const pairs = Object.entries(r.table)
    return L === 'R' ? `recode(${f}, ${pairs.map(([a, b]) => `${JSON.stringify(a)} = ${JSON.stringify(b)}`).join(', ')})` : `ifc(${f} = '', '', put(${f}, $${'recode'}.))`
  }
  if (r.kind === 'expr') { try { return expr(parse(r.expr), L) } catch (e) { return `/* does not parse: ${(e as Error).message} */` } }
  return ''
}

function partR(spec: DomainSpec, part: Part, i: number): string {
  const ds = part.source.toLowerCase()
  const order = evalOrder({ ...spec, rules: part.rules, transpose: part.transpose }, new Set())
  const lines: string[] = []
  if (part.transpose) {
    lines.push(`${spec.domain.toLowerCase()}_${i} <- bind_rows(`)
    lines.push(part.transpose.tests.map((t) => `  raw$${ds} %>% mutate(.testcd = "${t.code}", .field = "${t.field}", .result = ${t.field}, .unit = ${t.unitField ?? JSON.stringify(t.unit ?? '')})`).join(',\n'))
    lines.push(`) %>%`)
    if (part.transpose.drop.trim()) lines.push(`  filter(!(${ruleCode({ kind: 'expr', expr: part.transpose.drop }, 'R')})) %>%`)
  } else lines.push(`${spec.domain.toLowerCase()}_${i} <- raw$${ds} %>%`)
  if (part.filter?.trim()) lines.push(`  filter(${ruleCode({ kind: 'expr', expr: part.filter }, 'R')}) %>%`)
  const muts = order.filter((v) => part.rules[v] && !['seq', 'lobxfl'].includes(part.rules[v].kind)).map((v) => `    ${v} = ${ruleCode(part.rules[v], 'R')}`)
  lines.push(`  mutate(\n${muts.join(',\n')}\n  )`)
  return lines.join('\n')
}
export function toR(spec: DomainSpec): string {
  const d = spec.domain.toLowerCase()
  const parts: Part[] = [{ source: spec.source, filter: spec.filter, transpose: spec.transpose, rules: spec.rules }, ...(spec.parts ?? [])]
  const seq = spec.vars.find((v) => spec.rules[v]?.kind === 'seq')
  const flag = spec.vars.find((v) => spec.rules[v]?.kind === 'lobxfl')
  const fr = flag ? spec.rules[flag] as Extract<Rule, { kind: 'lobxfl' }> : undefined
  const out = [
    `# ${STUDY.id} · ${spec.domain} — generated from your mapping rules (read-only sketch).`,
    `# raw$<form> are the raw datasets; iso8601(), study_day(), epoch_of(), subj_value() and the other`,
    `# helpers are the study's shared functions, doing what the trainer's functions of the same purpose do.`,
    'library(dplyr)', '',
    ...parts.map((p, i) => partR(spec, p, i + 1) + '\n'),
    `${d} <- bind_rows(${parts.map((_, i) => `${d}_${i + 1}`).join(', ')}) %>%`,
    `  arrange(${spec.sort.join(', ')})${seq || fr ? ' %>%' : ''}`,
    ...(seq ? [`  group_by(USUBJID) %>% mutate(${seq} = row_number()) %>% ungroup()${fr ? ' %>%' : ''}`] : []),
    ...(fr ? [`  group_by(USUBJID, ${fr.by}) %>%`, `  mutate(${flag} = lobxfl(${fr.result}, ${fr.dtc}, rfxstdtc = dm_value("RFXSTDTC", SUBJID))) %>% ungroup()`] : []),
    '', `${d} <- ${d} %>% select(${spec.vars.join(', ')})`,
  ]
  if (spec.supp?.length) out.push('', `supp${d} <- ${d} %>%`, `  transmute(STUDYID, RDOMAIN = "${spec.domain}", USUBJID, IDVAR = ${spec.vars.includes(`${spec.domain}SEQ`) ? `"${spec.domain}SEQ"` : 'NA_character_'}, IDVARVAL = ${spec.vars.includes(`${spec.domain}SEQ`) ? `as.character(${spec.domain}SEQ)` : 'NA_character_'},`, ...spec.supp.map((q) => `            ${q.qnam} = ${ruleCode({ kind: 'expr', expr: q.expr }, 'R')},`), `  ) %>%`, `  pivot_longer(c(${spec.supp.map((q) => q.qnam).join(', ')}), names_to = "QNAM", values_to = "QVAL") %>%`, `  filter(!is_blank(QVAL))  # then add QLABEL, QORIG (${spec.supp.map((q) => `${q.qnam}: ${q.qorig}`).join('; ')}) and QEVAL`)
  return out.join('\n')
}

export function toSAS(spec: DomainSpec): string {
  const d = spec.domain.toLowerCase()
  const parts: Part[] = [{ source: spec.source, filter: spec.filter, transpose: spec.transpose, rules: spec.rules }, ...(spec.parts ?? [])]
  const seq = spec.vars.find((v) => spec.rules[v]?.kind === 'seq')
  const flag = spec.vars.find((v) => spec.rules[v]?.kind === 'lobxfl')
  const out = [
    `/* ${STUDY.id} · ${spec.domain} — generated from your mapping rules (read-only sketch).          */`,
    `/* iso8601(), study_day(), epoch_of(), subj_value() and the other helpers are the study's      */`,
    `/* macro library (PROC FCMP functions and hash look-ups); raw.<form> are the raw datasets.    */`, '',
  ]
  parts.forEach((p, i) => {
    const order = evalOrder({ ...spec, rules: p.rules, transpose: p.transpose }, new Set())
    out.push(`data ${d}_${i + 1} (keep=${spec.vars.filter((v) => p.rules[v] && !['seq', 'lobxfl'].includes(p.rules[v].kind)).join(' ')} SUBJID);`, `  set raw.${p.source.toLowerCase()};`)
    if (p.filter?.trim()) out.push(`  if not (${ruleCode({ kind: 'expr', expr: p.filter }, 'SAS')}) then delete;`)
    if (p.transpose) {
      out.push('  length __TESTCD $8 __FIELD $8 __RESULT $200 __UNIT $20;')
      for (const t of p.transpose.tests) out.push(`  __TESTCD = '${t.code}'; __FIELD = '${t.field}'; __RESULT = ${t.field}; __UNIT = ${t.unitField ?? `'${t.unit ?? ''}'`}; link derive;`)
      out.push('  return;', 'derive:')
      if (p.transpose.drop.trim()) out.push(`  if ${ruleCode({ kind: 'expr', expr: p.transpose.drop }, 'SAS')} then return;`)
    }
    for (const v of order) { const r = p.rules[v]; if (r && !['seq', 'lobxfl'].includes(r.kind)) out.push(`  ${v} = ${ruleCode(r, 'SAS')};`) }
    out.push(p.transpose ? '  output;\n  return;' : '', 'run;', '')
  })
  out.push(`data ${d}; set ${parts.map((_, i) => `${d}_${i + 1}`).join(' ')}; run;`, `proc sort data=${d}; by ${spec.sort.join(' ')}; run;`)
  if (seq) out.push(`data ${d}; set ${d}; by USUBJID; if first.USUBJID then ${seq} = 0; ${seq} + 1; run;`)
  if (flag) { const fr = spec.rules[flag] as Extract<Rule, { kind: 'lobxfl' }>; out.push(`/* ${flag}: Y on the last non-missing ${fr.result} per USUBJID and ${fr.by} with ${fr.dtc} <= RFXSTDTC (from DM): */`, `%lobxfl(data=${d}, flag=${flag}, result=${fr.result}, dtc=${fr.dtc}, by=${fr.by});`) }
  if (spec.vars.some((v) => spec.rules[v]?.kind === 'recode')) out.push('', '/* Recodes use formats defined from your recode tables, e.g.:', ...spec.vars.filter((v) => spec.rules[v]?.kind === 'recode').map((v) => { const r = spec.rules[v] as Extract<Rule, { kind: 'recode' }>; return `   proc format; value $recode ${Object.entries(r.table).map(([a, b]) => `'${a}' = '${b}'`).join(' ')}; run;   (for ${v}) */` }))
  return out.filter((x) => x !== '').join('\n')
}
