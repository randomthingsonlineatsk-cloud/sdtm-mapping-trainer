import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../state'
import { useNav } from '../App'
import { build, ruleError, fieldsFor, FN_HELP, RULE_LABEL, PSEUDO, type Rule, type DomainSpec, type TestMap, type Part, type SuppQual } from '../domain/engine'
import { toR, toSAS } from '../domain/codegen'
import { MISSIONS } from '../domain/missions'
import { varsOf, DETAIL_DOMAINS, domainInfo, CT, customVars, customCodeProblem, standardCandidates, type VarMeta, type CustomDomain } from '../domain/standards'
import { emptySpec, log, type Project, isGlv } from '../domain/project'
import { currentVersion } from '../domain/plan'
import { SORT, DEFAULT_SOURCE } from '../domain/reference'
import { Panel, Pill, Btn, Select, Table, TextArea, Tabs, ic } from './ui'
import { useData, formsOf, formName, fieldsOf, samples, distinct } from './shared'

const CORE_TONE = { Req: 'red', Exp: 'amber', Perm: 'grey' } as const

export default function Mapping() {
  const { p, act } = useStore()
  const nav = useNav()
  // nav.arg is a domain (DM) or a QC program (qc:VS).
  const argQc = nav.arg?.startsWith('qc:'), argDomain = argQc ? nav.arg!.slice(3) : nav.arg
  const domains = [...DETAIL_DOMAINS, ...(p.custom ?? []).map((c) => c.code)]
  const [domain, setDomain] = useState(argDomain && domains.includes(argDomain) ? argDomain : 'DM')
  const [defining, setDefining] = useState(false)
  // Production is the program delivered; QC is the second programmer's independent program.
  const [track, setTrack] = useState<'prod' | 'qc'>(argQc ? 'qc' : 'prod')
  const bag = track === 'qc' ? p.qc ?? {} : p.specs
  const spec = bag[domain]
  const data = useData()
  const forms = formsOf(p)
  const start = () => act((pp) => { const b = track === 'qc' ? (pp.qc ??= {}) : pp.specs; b[domain] = emptySpec(domain, DEFAULT_SOURCE[domain] && forms.includes(DEFAULT_SOURCE[domain]) ? DEFAULT_SOURCE[domain] : forms.includes(domain) ? domain : forms[0]); log(pp, `Started ${track === 'qc' ? 'QC programming' : 'mapping'} ${domain}`) })
  return (
    <div className="space-y-4">
      <Panel title="Mapping workspace" sub="Raw data on the left, SDTM variables on the right. Pick a variable, choose how it is filled, and watch the dataset rebuild below. Follow the study’s SDTM conventions on the Study tab."
        right={<Select aria-label="Domain to map" className="w-64" value={domain} onChange={(e) => setDomain(e.target.value)} options={domains.map((d) => ({ value: d, label: `${d} · ${domainInfo(d)?.name}${bag[d]?.vars.length ? ` (${bag[d].vars.length} vars)` : ''}` }))} />}>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Program">
          <Btn tone={track === 'prod' ? 'solid' : 'grey'} className="py-0.5" aria-pressed={track === 'prod'} onClick={() => setTrack('prod')}>Production</Btn>
          <Btn tone={track === 'qc' ? 'solid' : 'grey'} className="py-0.5" aria-pressed={track === 'qc'} onClick={() => setTrack('qc')}>QC (independent)</Btn>
          <span className="text-[11px] text-lab-text-muted">{track === 'qc' ? 'You are the QC programmer: write this domain again from the specification and conventions, without reading the production rules, then compare on the QC compare tab.' : 'The program that produces the delivered dataset.'}</span>
        </div>
        <p className="text-xs text-lab-text-muted">{domainInfo(domain)?.cls} · {domainInfo(domain)?.structure}. {(() => { const ms = MISSIONS.filter((m) => m.domains.includes(domain)); return ms.length ? `Scored by mission${ms.length > 1 ? 's' : ''} ${ms.map((m) => m.id).join(', ')} against a hidden reference.` : 'Free practice: no mission scores this domain.' })()} Trial design domains (TA, TE, TV, TI, TS) are built as tables on the Trial design tab.</p>
        <div className="flex flex-wrap gap-2">
          {!spec && <Btn tone="solid" onClick={start}>{track === 'qc' ? `Start QC programming of ${domain}` : `Start mapping ${domain}`}</Btn>}
          {isGlv(p) && <Btn tone="grey" onClick={() => setDefining(!defining)}>{defining ? 'Close' : 'Define a custom domain…'}</Btn>}
        </div>
        {(p.custom ?? []).some((c) => c.code === domain) && <CustomInfo code={domain} />}
      </Panel>
      {defining && <CustomBuilder onDone={(code) => { setDefining(false); setDomain(code) }} />}
      {spec && <Workspace key={`${track}-${domain}`} domain={domain} spec={spec} data={data} track={track} />}
    </div>
  )
}

function Workspace({ domain, spec, data, track }: { domain: string; spec: DomainSpec; data: ReturnType<typeof useData>; track: 'prod' | 'qc' }) {
  const bagOf = (pp: Project) => (track === 'qc' ? pp.qc! : pp.specs)
  const tag = track === 'qc' ? `QC ${domain}` : domain
  const { p, act } = useStore()
  const meta = varsOf(domain, p.version)
  const [sel, setSel] = useState<string | null>(spec.vars[0] ?? meta[0]?.name ?? null)
  const [part, setPart] = useState(0)
  const pi = part > (spec.parts?.length ?? 0) ? 0 : part
  // The active source: the main one, or one of the extra sources stacked into this domain.
  const active: Part = pi === 0 ? spec : spec.parts![pi - 1]
  const view: DomainSpec = { ...spec, source: active.source, filter: active.filter, transpose: active.transpose, rules: active.rules }
  const rawRows = data.forms[view.source] ?? []
  const raw = fieldsOf(p, view.source)
  const fields = fieldsFor(view, raw.map((f) => f.name))
  const built = useMemo(() => build(spec, data, p.version), [spec, data, p.version, JSON.stringify(spec)])
  const updDom = (fn: (s: DomainSpec) => void, what?: string) => act((pp) => { fn(bagOf(pp)[domain]); if (what) log(pp, `${tag}: ${what}`) })
  // Rule, filter and transpose edits go to the active source; the variable list and sort keys belong to the domain.
  const upd = (fn: (s: DomainSpec) => void, what?: string) => act((pp) => { const s = bagOf(pp)[domain]; fn((pi === 0 ? s : s.parts![pi - 1]) as DomainSpec); if (what) log(pp, `${tag}${pi ? ` source ${pi + 1}` : ''}: ${what}`) })
  const setVars = (names: Set<string>) => updDom((s) => { s.vars = meta.map((m) => m.name).filter((n) => names.has(n)) })
  const included = new Set(spec.vars)
  const toggle = (v: string) => { const n = new Set(included); if (n.has(v)) n.delete(v); else n.add(v); setVars(n); setSel(v) }
  return (
    <>
      <Panel title="Source" sub="The raw form that drives the records. A findings form collected wide (one column per test) is turned tall: one record per test. A domain fed by several forms (DS from the disposition form, the consent form and the IRT file) gets one source each: their records are stacked, then sorted and numbered together.">
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Sources of this domain">
          {[spec, ...(spec.parts ?? [])].map((x, i) => <Btn key={i} tone={i === pi ? 'solid' : 'grey'} className="py-0.5" aria-pressed={i === pi} onClick={() => setPart(i)}>Source {i + 1} · {x.source}</Btn>)}
          <Btn tone="grey" className="py-0.5" onClick={() => { updDom((s) => { s.parts = [...(s.parts ?? []), { source: formsOf(p).find((f) => f !== spec.source) ?? spec.source, rules: { ...(s.rules.STUDYID ? { STUDYID: s.rules.STUDYID } : {}), ...(s.rules.DOMAIN ? { DOMAIN: s.rules.DOMAIN } : {}) } }] }, 'added a source'); setPart((spec.parts?.length ?? 0) + 1) }}>+ Add a source</Btn>
          {pi > 0 && <Btn tone="red" className="py-0.5" onClick={() => { updDom((s) => { s.parts!.splice(pi - 1, 1); if (!s.parts!.length) delete s.parts }, `removed source ${pi + 1}`); setPart(0) }}>Remove source {pi + 1}</Btn>}
        </div>
        {pi > 0 && <p className="text-[11px] text-lab-text-muted">Each source has its own rules for the same variables. A variable without a rule in this source is null in its records. STUDYID and DOMAIN were copied from source 1.</p>}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-lab-text-muted">Records come from</span>
          <Select aria-label="Source form" className="w-72" value={view.source} onChange={(e) => upd((s) => { s.source = e.target.value }, `source form ${e.target.value}`)} options={formsOf(p).map((f) => ({ value: f, label: `${f} · ${formName(p, f)} (${(data.forms[f] ?? []).length} rows)` }))} />
          <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={!!view.transpose} onChange={(e) => upd((s) => { s.transpose = e.target.checked ? { tests: [], drop: 'isblank(__RESULT)' } : undefined }, e.target.checked ? 'wide to tall on' : 'wide to tall off')} />One record per test (wide to tall)</label>
        </div>
        <ExprLine label="Keep only rows where (optional)" value={view.filter ?? ''} fields={raw.map((f) => f.name)} onApply={(x) => upd((s) => { s.filter = x || undefined }, `filter ${x || 'removed'}`)} placeholder="e.g. VSPERF = 'Y'" />
        {view.transpose && <TransposeEditor domain={domain} spec={view} raw={raw.map((f) => f.name)} upd={upd} />}
        <div className="flex flex-wrap items-center gap-2 text-xs"><span className="text-lab-text-muted">Sort keys</span>
          <input aria-label="Sort keys" className={ic('w-96 font-mono text-xs')} defaultValue={spec.sort.join(', ')} key={spec.sort.join(',')} onBlur={(e) => updDom((s) => { s.sort = e.target.value.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean) }, 'sort keys')} />
          <span className="text-lab-text-muted">IG keys for this study: {(SORT[domain] ?? ['USUBJID']).join(', ')}</span>
        </div>
      </Panel>
      <div className="grid lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] gap-4">
        <Panel title={`Raw fields · ${view.source}`} sub={`${rawRows.length} rows`} className="lg:max-h-[70vh] lg:overflow-y-auto">
          <ul className="space-y-1.5 text-xs">
            {view.transpose && PSEUDO.map((x) => <li key={x}><span className="font-mono text-lab-ema">{x}</span> <span className="text-lab-text-muted">{x === '__TESTCD' ? 'test code of this record' : x === '__RESULT' ? 'the raw value for this test' : x === '__UNIT' ? 'the unit for this test' : 'the raw column name'}</span></li>)}
            {raw.map((f) => <li key={f.name}><span className="font-mono text-lab-fda">{f.name}</span>{f.label && <span className="text-lab-text-muted"> · {f.label}</span>}<br /><span className="text-[10px] text-lab-text-muted font-mono">{samples(rawRows, f.name).join(' | ') || '(blank)'}</span></li>)}
          </ul>
        </Panel>
        <div className="space-y-4">
          <Panel title={`${domain} variables`} sub="Tick the variables your dataset includes. Required and Expected must be there; Permissible only when the study collects them." right={<div className="flex gap-1"><Btn tone="grey" className="py-0.5" onClick={() => setVars(new Set([...included, ...meta.filter((m) => m.core !== 'Perm').map((m) => m.name)]))}>Add Req + Exp</Btn></div>}>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-1">
              {meta.map((m) => {
                const r = view.rules[m.name], on = included.has(m.name)
                const err = on && r ? ruleError(r, fields) : ''
                const runErr = built.errors[m.name]
                return (
                  <div key={m.name} className={`flex items-center gap-1.5 rounded border px-1.5 py-1 text-xs ${sel === m.name ? 'border-lab-fda' : 'border-lab-line'}`}>
                    <input type="checkbox" aria-label={`Include ${m.name}`} checked={on} onChange={() => toggle(m.name)} />
                    <button className="flex-1 text-left font-mono" onClick={() => setSel(m.name)} title={m.label}>{m.name}</button>
                    <Pill tone={CORE_TONE[m.core]}>{m.core}</Pill>
                    {on && (!r ? <span className="text-lab-amber" title="No rule yet">○</span> : err || runErr ? <span className="text-lab-red" title={err || runErr?.first}>!</span> : <span className="text-lab-cdsco" title="Rule set">✓</span>)}
                  </div>
                )
              })}
            </div>
          </Panel>
          {sel && <RuleEditor key={`${domain}-${pi}-${sel}`} m={meta.find((x) => x.name === sel)!} spec={view} fields={fields} rawRows={rawRows} upd={upd} included={included.has(sel)} include={() => toggle(sel)} runErr={built.errors[sel]} />}
        </div>
      </div>
      <SuppEditor spec={spec} fields={fields} built={built} updDom={updDom} ns={p.version !== '3.4'} />
      <Preview built={built} spec={spec} />
      <CodeView spec={spec} ver={p.version} />
    </>
  )
}

function ExprLine({ label, value, fields, onApply, placeholder }: { label: string; value: string; fields: string[]; onApply: (x: string) => void; placeholder?: string }) {
  const [x, setX] = useState(value)
  useEffect(() => setX(value), [value])
  const err = x.trim() ? ruleError({ kind: 'expr', expr: x }, [...fields, ...PSEUDO]) : ''
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-lab-text-muted">{label}</span>
      <input aria-label={label} className={ic('flex-1 min-w-64 font-mono text-xs')} value={x} placeholder={placeholder} onChange={(e) => setX(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !err) onApply(x.trim()) }} />
      <Btn tone="grey" className="py-0.5" disabled={!!err || x.trim() === value} onClick={() => onApply(x.trim())}>Apply</Btn>
      {err && <span className="text-lab-red">{err}</span>}
    </div>
  )
}

function TransposeEditor({ domain, spec, raw, upd }: { domain: string; spec: DomainSpec; raw: string[]; upd: (fn: (s: DomainSpec) => void, what?: string) => void }) {
  const t = spec.transpose!
  const codes = CT[`${domain}TESTCD`]?.terms.map((x) => x.value) ?? []
  const set = (i: number, patch: Partial<TestMap>) => upd((s) => { Object.assign(s.transpose!.tests[i], patch) })
  return (
    <div className="rounded border border-lab-line p-2 space-y-2">
      <p className="text-xs text-lab-text-muted">Each raw row becomes one record per test below. In rules, <span className="font-mono">__TESTCD</span>, <span className="font-mono">__RESULT</span> and <span className="font-mono">__UNIT</span> stand for the current test.</p>
      <datalist id={`codes-${domain}`}>{codes.map((c) => <option key={c} value={c} />)}</datalist>
      <Table head={['Test code', 'Raw result column', 'Unit', '']} rows={t.tests.map((x, i) => [
        <input aria-label={`Test code ${i + 1}`} list={`codes-${domain}`} className={ic('w-28 font-mono text-xs py-1')} value={x.code} onChange={(e) => set(i, { code: e.target.value.toUpperCase() })} />,
        <Select aria-label={`Raw column ${i + 1}`} className="w-40 text-xs py-1" value={x.field} onChange={(e) => set(i, { field: e.target.value })} options={[{ value: '', label: 'Choose…' }, ...raw.map((f) => ({ value: f, label: f }))]} />,
        <div className="flex gap-1">
          <Select aria-label={`Unit source ${i + 1}`} className="w-32 text-xs py-1" value={x.unitField !== undefined ? 'field' : 'fixed'} onChange={(e) => set(i, e.target.value === 'field' ? { unitField: raw[0], unit: undefined } : { unit: '', unitField: undefined })} options={[{ value: 'fixed', label: 'Fixed unit' }, { value: 'field', label: 'From a column' }]} />
          {x.unitField !== undefined ? <Select aria-label={`Unit column ${i + 1}`} className="w-32 text-xs py-1" value={x.unitField} onChange={(e) => set(i, { unitField: e.target.value })} options={raw.map((f) => ({ value: f, label: f }))} />
            : <input aria-label={`Unit ${i + 1}`} className={ic('w-28 text-xs py-1')} value={x.unit ?? ''} onChange={(e) => set(i, { unit: e.target.value })} placeholder="e.g. mmHg" />}
        </div>,
        <Btn tone="red" className="py-0.5" onClick={() => upd((s) => { s.transpose!.tests.splice(i, 1) }, `removed test ${x.code}`)}>Remove</Btn>,
      ])} empty="No tests yet." />
      <Btn tone="grey" className="py-0.5" onClick={() => upd((s) => { s.transpose!.tests.push({ code: '', field: '', unit: '' }) })}>Add a test</Btn>
      <ExprLine label="Drop a test record when" value={t.drop} fields={raw} onApply={(x) => upd((s) => { s.transpose!.drop = x }, `drop rule ${x}`)} placeholder="isblank(__RESULT)" />
    </div>
  )
}

function RuleEditor({ m, spec, fields, rawRows, upd, included, include, runErr }: { m: VarMeta; spec: DomainSpec; fields: string[]; rawRows: Record<string, string>[]; upd: (fn: (s: DomainSpec) => void, what?: string) => void; included: boolean; include: () => void; runErr?: { count: number; first: string } }) {
  const rule = spec.rules[m.name]
  const kinds = (Object.keys(RULE_LABEL) as Rule['kind'][]).filter((k) => (k === 'seq' ? m.name.endsWith('SEQ') : k === 'lobxfl' ? /(LOBXFL|BLFL)$/.test(m.name) : true))
  const set = (r: Rule | undefined, what: string) => upd((s) => { if (r) s.rules[m.name] = r; else delete s.rules[m.name] }, `${m.name}: ${what}`)
  const [expr, setExpr] = useState(rule?.kind === 'expr' ? rule.expr : '')
  const exprErr = expr.trim() ? ruleError({ kind: 'expr', expr }, fields) : ''
  const fresh = (k: Rule['kind']): Rule => k === 'copy' ? { kind: 'copy', field: '' } : k === 'const' ? { kind: 'const', value: '' } : k === 'recode' ? { kind: 'recode', field: '', table: {} } : k === 'expr' ? { kind: 'expr', expr: '' } : k === 'seq' ? { kind: 'seq' } : { kind: 'lobxfl', result: `${spec.domain}STRESC`, dtc: `${spec.domain}DTC`, by: `${spec.domain}TESTCD` }
  const ct = m.ct ? CT[m.ct] : undefined
  return (
    <Panel title={`${m.name} · ${m.label}`} sub={`${m.type} · ${m.role} · ${m.core === 'Req' ? 'Required' : m.core === 'Exp' ? 'Expected' : 'Permissible'}${ct ? ` · codelist ${ct.id}${ct.extensible ? ' (extensible)' : ''}` : ''}${m.note ? ` · ${m.note}` : ''}`}>
      {!included && <p className="text-xs text-lab-amber">Not in your dataset. <button className="underline" onClick={include}>Include {m.name}</button></p>}
      <SpecLine domain={spec.domain} variable={m.name} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-lab-text-muted">Filled by</span>
        <Select aria-label="Rule type" className="w-72" value={rule?.kind ?? ''} onChange={(e) => { const k = e.target.value as Rule['kind'] | ''; set(k ? fresh(k) : undefined, k ? RULE_LABEL[k] : 'rule removed'); if (k === 'expr') setExpr('') }} options={[{ value: '', label: 'No rule yet' }, ...kinds.map((k) => ({ value: k, label: RULE_LABEL[k] }))]} />
      </div>
      {rule?.kind === 'copy' && <Select aria-label="Raw field" className="w-64" value={rule.field} onChange={(e) => set({ kind: 'copy', field: e.target.value }, `copy ${e.target.value}`)} options={[{ value: '', label: 'Choose a field…' }, ...fields.map((f) => ({ value: f, label: f }))]} />}
      {rule?.kind === 'const' && <div className="flex gap-2 items-center"><input aria-label="Constant value" className={ic('w-72 font-mono')} defaultValue={rule.value} key={rule.value} onBlur={(e) => set({ kind: 'const', value: e.target.value }, `constant "${e.target.value}"`)} placeholder="Leave empty for a null column" />{ct && <span className="text-[11px] text-lab-text-muted">CT: {ct.terms.slice(0, 8).map((t) => t.value).join(', ')}{ct.terms.length > 8 ? '…' : ''}</span>}</div>}
      {rule?.kind === 'recode' && <Recode rule={rule} fields={fields} rawRows={rawRows} ctTerms={ct?.terms.map((t) => t.value) ?? []} onChange={(r) => set(r, 'recode table')} />}
      {rule?.kind === 'expr' && (
        <div className="space-y-1">
          <TextArea aria-label="Expression" className="font-mono text-xs min-h-16" value={expr} onChange={(e) => setExpr(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !exprErr) set({ kind: 'expr', expr: expr.trim() }, `expression ${expr.trim()}`) }} placeholder="e.g. concat('GLV-12-301-', SUBJID)" />
          <div className="flex items-center gap-2"><Btn tone="solid" disabled={!!exprErr || !expr.trim() || expr.trim() === rule.expr} onClick={() => set({ kind: 'expr', expr: expr.trim() }, `expression ${expr.trim()}`)}>Apply (Ctrl+Enter)</Btn>{exprErr && <span className="text-xs text-lab-red">{exprErr}</span>}</div>
          <details className="text-xs"><summary className="cursor-pointer text-lab-text-muted">Functions</summary><ul className="mt-1 space-y-0.5">{FN_HELP.map((f) => <li key={f.sig}><span className="font-mono text-lab-fda">{f.sig}</span> · {f.what}</li>)}</ul><p className="mt-1 text-lab-text-muted">A name refers to the raw field first; if the raw form has no such field, to a variable of this dataset (it is derived first).</p></details>
        </div>
      )}
      {rule?.kind === 'seq' && <p className="text-xs text-lab-text-muted">Numbered 1, 2, 3… within each USUBJID after sorting by the sort keys.</p>}
      {rule?.kind === 'lobxfl' && (
        <div className="flex flex-wrap gap-2 text-xs items-center">
          <span>Y on the last record per subject and</span>
          <Select aria-label="Group by" className="w-36 text-xs" value={rule.by} onChange={(e) => set({ ...rule, by: e.target.value }, 'flag grouping')} options={spec.vars.map((v) => ({ value: v, label: v }))} />
          <span>with a non-missing</span>
          <Select aria-label="Result variable" className="w-36 text-xs" value={rule.result} onChange={(e) => set({ ...rule, result: e.target.value }, 'flag result')} options={spec.vars.map((v) => ({ value: v, label: v }))} />
          <span>and</span>
          <Select aria-label="Date variable" className="w-36 text-xs" value={rule.dtc} onChange={(e) => set({ ...rule, dtc: e.target.value }, 'flag date')} options={spec.vars.map((v) => ({ value: v, label: v }))} />
          <span>on or before RFXSTDTC.</span>
        </div>
      )}
      {runErr && <p className="text-xs text-lab-red">Failed on {runErr.count} record{runErr.count === 1 ? '' : 's'}: {runErr.first}</p>}
    </Panel>
  )
}

function Recode({ rule, fields, rawRows, ctTerms, onChange }: { rule: Extract<Rule, { kind: 'recode' }>; fields: string[]; rawRows: Record<string, string>[]; ctTerms: string[]; onChange: (r: Rule) => void }) {
  const vals = rule.field ? distinct(rawRows, rule.field) : []
  return (
    <div className="space-y-2">
      <Select aria-label="Raw field to recode" className="w-64" value={rule.field} onChange={(e) => onChange({ ...rule, field: e.target.value })} options={[{ value: '', label: 'Choose a field…' }, ...fields.map((f) => ({ value: f, label: f }))]} />
      {vals.length > 40 ? <p className="text-xs text-lab-amber">{vals.length} distinct values: use an expression instead.</p> : vals.length > 0 && (
        <>
          <datalist id="ct-terms">{ctTerms.map((t) => <option key={t} value={t} />)}</datalist>
          <Table head={['Raw value', 'SDTM value']} rows={vals.map((v) => [<span className="font-mono">{v}</span>, <input aria-label={`Recode ${v}`} list="ct-terms" className={ic('w-64 font-mono text-xs py-1')} defaultValue={rule.table[v] ?? ''} onBlur={(e) => onChange({ ...rule, table: { ...rule.table, [v]: e.target.value } })} />])} />
          <p className="text-[11px] text-lab-text-muted">A raw value without a recode is copied unchanged and reported.</p>
        </>
      )}
    </div>
  )
}

function Preview({ built, spec }: { built: ReturnType<typeof build>; spec: DomainSpec }) {
  const { go } = useNav()
  const [n, setN] = useState(25)
  const errs = Object.entries(built.errors)
  return (
    <Panel title={`Preview · ${built.rows.length} records`} sub="Rebuilt after every change. The full dataset, filters and conformance checks are on Datasets & checks." right={<Btn tone="grey" onClick={() => go('datasets', spec.domain)}>Open in Datasets & checks</Btn>}>
      {built.warnings.map((w) => <p key={w} className="text-xs text-lab-amber">{w}</p>)}
      {errs.length > 0 && <ul className="text-xs text-lab-red list-disc pl-5">{errs.map(([v, e]) => <li key={v}>{v}: {e.count} record{e.count === 1 ? '' : 's'} failed · {e.first}</li>)}</ul>}
      {spec.vars.length === 0 ? <p className="text-sm text-lab-text-muted">Tick variables above to see the dataset.</p> : (
        <>
          <Table head={spec.vars} rows={built.rows.slice(0, n).map((r) => spec.vars.map((v) => <span className="font-mono whitespace-nowrap">{r[v]}</span>))} />
          {built.rows.length > n && <Btn tone="grey" onClick={() => setN(n + 50)}>Show 50 more</Btn>}
        </>
      )}
    </Panel>
  )
}

// Supplemental qualifiers: non-standard variables go to SUPP-- as name/value pairs keyed back to
// the parent record (IDVAR/IDVARVAL = --SEQ). Each qualifier is an expression evaluated on every
// parent record; a record gets a SUPP row only where the value is not null.
const QORIG: SuppQual['qorig'][] = ['Collected', 'Derived', 'Assigned']
function SuppEditor({ spec, fields, built, updDom, ns }: { spec: DomainSpec; fields: string[]; built: ReturnType<typeof build>; updDom: (fn: (s: DomainSpec) => void, what?: string) => void; ns: boolean }) {
  const rel = `${ns ? 'NS' : 'SUPP'}${spec.domain}`, N = ns ? 'Name' : 'QNAM', L = ns ? 'Label' : 'QLABEL'
  const q = spec.supp ?? []
  const set = (i: number, patch: Partial<SuppQual>, what?: string) => updDom((s) => { Object.assign(s.supp![i], patch) }, what)
  const bad = (x: SuppQual) => !/^[A-Z][A-Z0-9]{0,7}$/.test(x.qnam) ? `${N}: up to 8 capital letters or digits, starting with a letter` : x.qlabel.length > 40 ? `${L}: at most 40 characters` : spec.vars.includes(x.qnam) ? `${x.qnam} is a standard variable of ${spec.domain}: it belongs in the domain, not ${rel}` : x.expr.trim() ? ruleError({ kind: 'expr', expr: x.expr }, fields) : ''
  return (
    <Panel title={`${ns ? 'Non-standard variables' : 'Supplemental qualifiers'} · ${rel}`} sub={`For collected or derived values with no variable in ${spec.domain}. Use them sparingly: a value with a standard variable goes there. ${ns ? `SDTMIG v4.0 draft: ${rel} has one record per ${spec.domain} record with a value, each non-standard variable a column; label, origin and evaluator go to define.xml.` : `SUPP${spec.domain} has one record per value, with QNAM, QLABEL, QVAL, QORIG and QEVAL.`} ${built.supp ? `${built.supp.rows.length} ${rel} records.` : ''}`}
      right={<Btn tone="grey" className="py-0.5" onClick={() => updDom((s) => { s.supp = [...(s.supp ?? []), { qnam: '', qlabel: '', expr: '', qorig: 'Derived' }] }, ns ? 'added a non-standard variable' : 'added a supplemental qualifier')}>{ns ? '+ Add a variable' : '+ Add a qualifier'}</Btn>}>
      {q.length === 0 ? <p className="text-xs text-lab-text-muted">{ns ? 'No non-standard variables.' : 'No supplemental qualifiers.'}</p> : (
        <div className="space-y-2">
          {q.map((x, i) => {
            const err = bad(x)
            return (
              <div key={i} className="rounded border border-lab-line p-2 space-y-1.5">
                <div className="flex flex-wrap gap-2 items-center text-xs">
                  <input aria-label={`${N} ${i + 1}`} className={ic('w-28 font-mono text-xs py-1')} defaultValue={x.qnam} onBlur={(e) => set(i, { qnam: e.target.value.toUpperCase().trim() }, `QNAM ${e.target.value.toUpperCase()}`)} placeholder={N} />
                  <input aria-label={`${L} ${i + 1}`} className={ic('w-72 text-xs py-1')} defaultValue={x.qlabel} onBlur={(e) => set(i, { qlabel: e.target.value })} placeholder={`${L} (≤ 40 characters)`} />
                  <Select aria-label={`${ns ? 'Origin' : 'QORIG'} ${i + 1}`} className="w-32 text-xs py-1" value={x.qorig} onChange={(e) => set(i, { qorig: e.target.value as SuppQual['qorig'] })} options={QORIG.map((o) => ({ value: o, label: o }))} />
                  <input aria-label={`${ns ? 'Evaluator' : 'QEVAL'} ${i + 1}`} className={ic('w-36 text-xs py-1')} defaultValue={x.qeval ?? ''} onBlur={(e) => set(i, { qeval: e.target.value || undefined })} placeholder={ns ? 'Evaluator (optional)' : 'QEVAL (optional)'} />
                  <Btn tone="red" className="py-0.5" onClick={() => updDom((s) => { s.supp!.splice(i, 1); if (!s.supp!.length) delete s.supp }, `removed ${x.qnam}`)}>Remove</Btn>
                </div>
                <input aria-label={`${ns ? 'Value' : 'QVAL'} expression ${i + 1}`} className={ic('w-full font-mono text-xs py-1')} defaultValue={x.expr} onBlur={(e) => set(i, { expr: e.target.value.trim() }, `${x.qnam} expression`)} placeholder={`${ns ? 'Value' : 'QVAL'}: an expression on the parent record (raw fields first, then ${spec.domain} variables)`} title="e.g. if(studyday(AESTDTC, dm('RFXSTDTC')) >= 1, 'Y', 'N')" />
                {err && <p className="text-xs text-lab-red">{err}</p>}
                {built.errors[`SUPP ${x.qnam}`] && <p className="text-xs text-lab-red">Failed on {built.errors[`SUPP ${x.qnam}`].count} records: {built.errors[`SUPP ${x.qnam}`].first}</p>}
              </div>
            )
          })}
          {built.supp && built.supp.rows.length > 0 && <Table head={built.supp.vars} rows={built.supp.rows.slice(0, 8).map((r) => built.supp!.vars.map((v) => <span className="font-mono whitespace-nowrap">{r[v]}</span>))} />}
        </div>
      )}
    </Panel>
  )
}

// The same mapping as an R (dplyr) or SAS program, to read alongside the visual rules.
function CodeView({ spec, ver }: { spec: DomainSpec; ver: '3.4' | '4.0d' }) {
  const [lang, setLang] = useState<'R' | 'SAS' | ''>('')
  const code = lang === 'R' ? toR(spec, ver) : lang === 'SAS' ? toSAS(spec, ver) : ''
  return (
    <Panel title="Your mapping as code" sub="A read-only translation of your rules into the program a clinical programmer would write. Study look-ups (first dose date, visit numbers, epochs) appear as calls to the study’s shared helper functions. It is a sketch to read, not a validated program.">
      <Tabs tabs={[{ id: '' as const, label: 'Hidden' }, { id: 'R' as const, label: 'R (dplyr)' }, { id: 'SAS' as const, label: 'SAS' }]} value={lang} onChange={setLang} />
      {code && <>
        <pre className="max-h-[60vh] overflow-auto rounded border border-lab-line bg-lab-panel-strong p-3 text-[11px] leading-relaxed font-mono whitespace-pre">{code}</pre>
        <Btn tone="grey" className="py-0.5" onClick={() => navigator.clipboard?.writeText(code)}>Copy</Btn>
      </>}
    </Panel>
  )
}

// The approved specification for this variable, shown while programming it.
function SpecLine({ domain, variable }: { domain: string; variable: string }) {
  const { p } = useStore()
  const plan = p.plan?.[domain], cur = plan && currentVersion(plan)
  if (!cur) return null
  const r = cur.rows.find((x) => x.variable === variable)
  return (
    <p className="text-xs rounded border border-lab-line px-2 py-1"><span className="text-lab-text-muted">Specification {cur.version}:</span>{' '}
      {r ? <><b>{r.origin}</b>{r.source && <> · <span className="font-mono">{r.source}</span></>}{r.method && <> · {r.method}</>}</> : <span className="text-lab-amber">not in the specification</span>}
    </p>
  )
}

// A sponsor-defined domain: allowed only when no published domain fits the data. The builder
// asks what the data are, lists the standard domains that might hold them, and records why
// none does, then creates the domain from the general observation class variables.
function CustomBuilder({ onDone }: { onDone: (code: string) => void }) {
  const { act } = useStore()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [cls, setCls] = useState<CustomDomain['cls']>('Interventions')
  const [structure, setStructure] = useState('')
  const [what, setWhat] = useState('')
  const [reason, setReason] = useState('')
  const problem = code ? customCodeProblem(code) : ''
  const cands = standardCandidates(`${name} ${what}`)
  const ok = code && !problem && name.trim() && structure.trim() && reason.trim().length >= 20
  return (
    <Panel title="Define a custom domain" sub="SDTMIG allows a sponsor-defined domain only when no published domain fits the data. Describe the data first, check the standard domains suggested, and record why none fits: the reason goes into define.xml and the reviewer’s guide.">
      <div className="grid sm:grid-cols-2 gap-2 text-xs">
        <label className="space-y-1"><span>What the data are</span><input aria-label="What the data are" className={ic('w-full text-xs')} value={what} onChange={(e) => setWhat(e.target.value)} placeholder="e.g. diabetes education sessions the site gave" /></label>
        <label className="space-y-1"><span>Domain name</span><input aria-label="Custom domain name" className={ic('w-full text-xs')} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Diabetes Education" /></label>
        <label className="space-y-1"><span>Code (2 letters)</span><input aria-label="Custom domain code" className={ic('w-24 font-mono text-xs')} value={code} maxLength={2} onChange={(e) => setCode(e.target.value.toUpperCase())} />{problem && <span className="block text-lab-red">{problem}</span>}</label>
        <label className="space-y-1"><span>Observation class</span><Select aria-label="Observation class" className="w-48 text-xs py-1" value={cls} onChange={(e) => setCls(e.target.value as CustomDomain['cls'])} options={['Interventions', 'Events', 'Findings'].map((x) => ({ value: x, label: x }))} /><span className="block text-lab-text-muted">Interventions: given to or taken by the subject. Events: things that happen. Findings: results of tests and assessments.</span></label>
        <label className="space-y-1 sm:col-span-2"><span>Structure</span><input aria-label="Custom domain structure" className={ic('w-full text-xs')} value={structure} onChange={(e) => setStructure(e.target.value)} placeholder="One record per … per subject" /></label>
      </div>
      {cands.length > 0 && <p className="text-xs text-lab-amber" role="note">Check these standard domains before creating a custom one: {cands.map((c) => `${c} (${domainInfo(c)?.name ?? c})`).join(', ')}.</p>}
      <label className="block text-xs space-y-1"><span>Why no standard domain fits</span><textarea aria-label="Why no standard domain fits" className={ic('w-full text-xs h-16')} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Name the domains you considered and why they do not hold these data" /></label>
      <Btn tone="solid" disabled={!ok} onClick={() => { act((pp) => { (pp.custom ??= []).push({ code, name: name.trim(), cls, structure: structure.trim(), reason: reason.trim(), vars: customVars(code, cls) }); log(pp, `Custom domain ${code} (${cls}) defined`) }); onDone(code) }}>Create {code || 'the domain'}</Btn>
    </Panel>
  )
}
function CustomInfo({ code }: { code: string }) {
  const { p, act } = useStore()
  const c = p.custom!.find((x) => x.code === code)!
  return (
    <div className="text-xs rounded border border-lab-line p-2 space-y-1">
      <p><b>{c.code} · {c.name}</b> · sponsor-defined {c.cls} domain · {c.structure}</p>
      <p className="text-lab-text-muted">Why no standard domain fits: {c.reason}</p>
      <Btn tone="red" className="py-0.5" onClick={() => act((pp) => { pp.custom = pp.custom!.filter((x) => x.code !== code); delete pp.specs[code]; log(pp, `Custom domain ${code} removed`) })}>Remove {code}</Btn>
    </div>
  )
}
