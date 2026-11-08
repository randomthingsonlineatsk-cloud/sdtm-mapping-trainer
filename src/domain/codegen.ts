// A read-only R and SAS view of a mapping (decision D3): each rule translated into the shape a
// clinical programmer would write it, so a learner sees how the visual mapping becomes code.
// Cross-dataset look-ups (first dose date, IRT arm, reference DM) become calls to study helper
// functions, named the same in R and SAS (in SAS, PROC FCMP functions or hash look-ups in a
// study macro library). It is a sketch for reading, not a validated program.

import { parse, type Node } from './expr'
import { evalOrder, type DomainSpec, type Part, type Rule } from './engine'
import { STUDY } from './study'
import { relName, type Version } from './standards'

type Lang = 'R' | 'SAS'
const PSEUDO_R: Record<string, string> = { __TESTCD: '.testcd', __RESULT: '.result', __UNIT: '.unit', __FIELD: '.field' }
const HELPERS: Record<string, string> = {
  iso: 'iso8601', dtc: 'dtc_iso', subj: 'subj_value', subjwhere: 'subj_value_where', irt: 'irt_value', country: 'site_country', armname: 'arm_name', age: 'age_years', dm: 'dm_value',
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
      if (f === 'wrap') return L === 'R' ? `wrap_text(${a[0]}, ${a[1]}, ${a[2]})` : `%scan_wrap(${a[0]}, ${a[1]}, ${a[2]})`
      if (f === 'part') return L === 'R' ? `trimws(stringr::str_split_i(${a[0]}, stringr::fixed(${a[1]}), ${a[2]}))` : `strip(scan(${a[0]}, ${a[2]}, ${a[1]}))`
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

const allQuals = (spec: DomainSpec) => [...(spec.supp ?? []), ...(spec.parts ?? []).flatMap((p) => p.supp ?? [])].filter((q, i, a) => q.qnam && a.findIndex((x) => x.qnam === q.qnam) === i)
const seqOf = (spec: DomainSpec) => (spec.vars.includes(`${spec.domain}SEQ`) ? `${spec.domain}SEQ` : '')

// SUPP-- (one record per value) or, in the v4.0 draft, NS-- (one record per parent record).
function relR(spec: DomainSpec, quals: NonNullable<DomainSpec['supp']>, ver: Version): string[] {
  const d = spec.domain.toLowerCase(), rel = relName(spec.domain, ver), seq = seqOf(spec), names = quals.map((q) => q.qnam)
  const head = `  transmute(STUDYID, RDOMAIN = "${spec.domain}", USUBJID, IDVAR = ${seq ? `"${seq}"` : 'NA_character_'}, `
  const cols = names.map((n) => `${n} = .${n}`).join(', ')
  if (ver !== '4.0d') return [
    `${rel.toLowerCase()} <- ${d}_all %>%`, `${head}IDVARVAL = ${seq ? `as.character(${seq})` : 'NA_character_'}, ${cols}) %>%`,
    `  pivot_longer(c(${names.join(', ')}), names_to = "QNAM", values_to = "QVAL") %>%`, '  filter(!is_blank(QVAL)) %>%',
    `  mutate(QLABEL = recode(QNAM, ${quals.map((q) => `${q.qnam} = ${JSON.stringify(q.qlabel)}`).join(', ')}),`,
    `         QORIG = recode(QNAM, ${quals.map((q) => `${q.qnam} = ${JSON.stringify(q.qorig)}`).join(', ')}),`,
    `         QEVAL = ${quals.some((q) => q.qeval) ? `recode(QNAM, ${quals.map((q) => `${q.qnam} = ${JSON.stringify(q.qeval ?? '')}`).join(', ')})` : 'NA_character_'}) %>%`,
    '  select(STUDYID, RDOMAIN, USUBJID, IDVAR, IDVARVAL, QNAM, QLABEL, QVAL, QORIG, QEVAL)',
  ]
  return [
    `${rel.toLowerCase()} <- ${d}_all %>%`, `${head}IDVARVLN = ${seq ? seq : 'NA_real_'}, ${cols}) %>%`,
    `  filter(if_any(c(${names.join(', ')}), ~ !is_blank(.x)))`,
    `# Labels and origins of ${names.join(', ')} go to define.xml: ${quals.map((q) => `${q.qnam} "${q.qlabel}" (${q.qorig})`).join('; ')}`,
  ]
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
  const quals = (i === 1 ? spec.supp : part.supp) ?? []
  const muts = [
    ...quals.filter((q) => q.qnam && q.expr.trim()).map((q) => `    .${q.qnam} = ${ruleCode({ kind: 'expr', expr: q.expr }, 'R')}`),
    ...order.filter((v) => part.rules[v] && !['seq', 'lobxfl'].includes(part.rules[v].kind)).map((v) => `    ${v} = ${ruleCode(part.rules[v], 'R')}`),
  ]
  lines.push(`  mutate(\n${muts.join(',\n')}\n  )`)
  return lines.join('\n')
}
export function toR(spec: DomainSpec, ver: Version = '3.4'): string {
  const d = spec.domain.toLowerCase()
  const parts: Part[] = [{ source: spec.source, filter: spec.filter, transpose: spec.transpose, rules: spec.rules }, ...(spec.parts ?? [])]
  const seq = spec.vars.find((v) => spec.rules[v]?.kind === 'seq')
  const flag = spec.vars.find((v) => spec.rules[v]?.kind === 'lobxfl')
  const fr = flag ? spec.rules[flag] as Extract<Rule, { kind: 'lobxfl' }> : undefined
  const quals = allQuals(spec)
  const out = [
    `# ${(spec.rules.STUDYID as { value?: string } | undefined)?.value ?? STUDY.id} · ${spec.domain} — generated from your mapping rules (read-only sketch).`,
    `# raw$<form> are the raw datasets; iso8601(), study_day(), epoch_of(), subj_value() and the other`,
    `# helpers are the study's shared functions, doing what the trainer's functions of the same purpose do.`,
    'library(dplyr)', ...(quals.length && ver !== '4.0d' ? ['library(tidyr)'] : []), '',
    ...parts.map((p, i) => partR(spec, p, i + 1) + '\n'),
    `${d}${quals.length ? '_all' : ''} <- bind_rows(${parts.map((_, i) => `${d}_${i + 1}`).join(', ')}) %>%`,
    `  arrange(${spec.sort.join(', ')})${seq || fr ? ' %>%' : ''}`,
    ...(seq ? [`  group_by(USUBJID) %>% mutate(${seq} = row_number()) %>% ungroup()${fr ? ' %>%' : ''}`] : []),
    ...(fr ? [`  group_by(USUBJID, ${fr.by}) %>%`, `  mutate(${flag} = lobxfl(${fr.result}, ${fr.dtc}, rfxstdtc = dm_value("RFXSTDTC", SUBJID))) %>% ungroup()`] : []),
    '', `${d} <- ${d}${quals.length ? '_all' : ''} %>% select(${spec.vars.join(', ')})`,
  ]
  if (quals.length) out.push('', ...relR(spec, quals, ver))
  return out.join('\n')
}

export function toSAS(spec: DomainSpec, ver: Version = '3.4'): string {
  const d = spec.domain.toLowerCase()
  const parts: Part[] = [{ source: spec.source, filter: spec.filter, transpose: spec.transpose, rules: spec.rules }, ...(spec.parts ?? [])]
  const seq = spec.vars.find((v) => spec.rules[v]?.kind === 'seq')
  const flag = spec.vars.find((v) => spec.rules[v]?.kind === 'lobxfl')
  const out = [
    `/* ${(spec.rules.STUDYID as { value?: string } | undefined)?.value ?? STUDY.id} · ${spec.domain} — generated from your mapping rules (read-only sketch).          */`,
    `/* iso8601(), study_day(), epoch_of(), subj_value() and the other helpers are the study's      */`,
    `/* macro library (PROC FCMP functions and hash look-ups); raw.<form> are the raw datasets.    */`, '',
  ]
  parts.forEach((p, i) => {
    const order = evalOrder({ ...spec, rules: p.rules, transpose: p.transpose }, new Set())
    const pq = ((i === 0 ? spec.supp : p.supp) ?? []).filter((q) => q.qnam && q.expr.trim())
    out.push(`data ${d}_${i + 1} (keep=${spec.vars.filter((v) => p.rules[v] && !['seq', 'lobxfl'].includes(p.rules[v].kind)).join(' ')} SUBJID${pq.map((q) => ` _${q.qnam}`).join('')});`, `  set raw.${p.source.toLowerCase()};`)
    if (p.filter?.trim()) out.push(`  if not (${ruleCode({ kind: 'expr', expr: p.filter }, 'SAS')}) then delete;`)
    if (p.transpose) {
      out.push('  length __TESTCD $8 __FIELD $8 __RESULT $200 __UNIT $20;')
      for (const t of p.transpose.tests) out.push(`  __TESTCD = '${t.code}'; __FIELD = '${t.field}'; __RESULT = ${t.field}; __UNIT = ${t.unitField ?? `'${t.unit ?? ''}'`}; link derive;`)
      out.push('  return;', 'derive:')
      if (p.transpose.drop.trim()) out.push(`  if ${ruleCode({ kind: 'expr', expr: p.transpose.drop }, 'SAS')} then return;`)
    }
    for (const q of pq) out.push(`  _${q.qnam} = ${ruleCode({ kind: 'expr', expr: q.expr }, 'SAS')};  /* from the raw values, before they are overwritten */`)
    for (const v of order) { const r = p.rules[v]; if (r && !['seq', 'lobxfl'].includes(r.kind)) out.push(`  ${v} = ${ruleCode(r, 'SAS')};`) }
    out.push(p.transpose ? '  output;\n  return;' : '', 'run;', '')
  })
  out.push(`data ${d}; set ${parts.map((_, i) => `${d}_${i + 1}`).join(' ')}; run;`, `proc sort data=${d}; by ${spec.sort.join(' ')}; run;`)
  if (seq) out.push(`data ${d}; set ${d}; by USUBJID; if first.USUBJID then ${seq} = 0; ${seq} + 1; run;`)
  if (flag) { const fr = spec.rules[flag] as Extract<Rule, { kind: 'lobxfl' }>; out.push(`/* ${flag}: Y on the last non-missing ${fr.result} per USUBJID and ${fr.by} with ${fr.dtc} <= RFXSTDTC (from DM): */`, `%lobxfl(data=${d}, flag=${flag}, result=${fr.result}, dtc=${fr.dtc}, by=${fr.by});`) }
  const quals = allQuals(spec)
  if (quals.length) {
    const rel = relName(spec.domain, ver), seq = seqOf(spec), names = quals.map((q) => q.qnam)
    if (ver !== '4.0d') out.push(`data ${rel.toLowerCase()} (keep=STUDYID RDOMAIN USUBJID IDVAR IDVARVAL QNAM QLABEL QVAL QORIG QEVAL);`, `  set ${d};`, '  length RDOMAIN $2 IDVAR $8 IDVARVAL $200 QNAM $8 QLABEL $40 QVAL $200 QORIG $20 QEVAL $40;',
      `  RDOMAIN = '${spec.domain}'; IDVAR = '${seq}'; IDVARVAL = ${seq ? `strip(put(${seq}, best.))` : "''"};`,
      ...quals.map((q) => `  if not missing(_${q.qnam}) then do; QNAM = '${q.qnam}'; QLABEL = '${q.qlabel.replace(/'/g, "''")}'; QVAL = _${q.qnam}; QORIG = '${q.qorig}'; QEVAL = '${q.qeval ?? ''}'; output; end;`), 'run;',
      `proc sort data=${rel.toLowerCase()}; by USUBJID IDVARVAL QNAM; run;`)
    else out.push(`data ${rel.toLowerCase()} (keep=STUDYID RDOMAIN USUBJID IDVAR IDVARVLN ${names.join(' ')});`, `  set ${d};`, `  length RDOMAIN $2 IDVAR $8;`,
      `  RDOMAIN = '${spec.domain}'; IDVAR = '${seq}'; IDVARVLN = ${seq || '.'};`, ...names.map((n) => `  ${n} = _${n};`),
      `  if cmiss(${names.join(', ')}) < ${names.length};  /* one record per ${spec.domain} record with a non-standard value */`,
      `  label ${quals.map((q) => `${q.qnam} = '${q.qlabel.replace(/'/g, "''")}'`).join(' ')};`, 'run;')
    out.push(`data ${d}; set ${d} (drop=${names.map((n) => `_${n}`).join(' ')}); run;`)
  }
  if (spec.vars.some((v) => spec.rules[v]?.kind === 'recode')) out.push('', '/* Recodes use formats defined from your recode tables, e.g.:', ...spec.vars.filter((v) => spec.rules[v]?.kind === 'recode').map((v) => { const r = spec.rules[v] as Extract<Rule, { kind: 'recode' }>; return `   proc format; value $recode ${Object.entries(r.table).map(([a, b]) => `'${a}' = '${b}'`).join(' ')}; run;   (for ${v}) */` }))
  return out.filter((x) => x !== '').join('\n')
}
