import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../state'
import { useNav } from '../App'
import { build, ruleError, fieldsFor, FN_HELP, RULE_LABEL, PSEUDO, type Rule, type DomainSpec, type TestMap, type Part, type SuppQual } from '../domain/engine'
import { toR, toSAS } from '../domain/codegen'
import { MISSIONS } from '../domain/missions'
import { varsOf, DETAIL_DOMAINS, domainInfo, CT, type VarMeta } from '../domain/standards'
import { emptySpec, log } from '../domain/project'
import { SORT } from '../domain/reference'
import { Panel, Pill, Btn, Select, Table, TextArea, Tabs, ic } from './ui'
import { useData, formsOf, formName, fieldsOf, samples, distinct } from './shared'

const CORE_TONE = { Req: 'red', Exp: 'amber', Perm: 'grey' } as const

export default function Mapping() {
  const { p, act } = useStore()
  const nav = useNav()
  const [domain, setDomain] = useState(nav.arg && DETAIL_DOMAINS.includes(nav.arg) ? nav.arg : 'DM')
  const spec = p.specs[domain]
  const data = useData()
  const forms = formsOf(p)
  const start = () => act((pp) => { pp.specs[domain] = emptySpec(domain, domain === 'LB' && forms.includes('LBC') ? 'LBC' : forms.includes(domain) ? domain : forms[0]); log(pp, `Started mapping ${domain}`) })
  return (
    <div className="space-y-4">
      <Panel title="Mapping workspace" sub="Raw data on the left, SDTM variables on the right. Pick a variable, choose how it is filled, and watch the dataset rebuild below. Follow the study’s SDTM conventions on the Study tab."
        right={<Select aria-label="Domain to map" className="w-64" value={domain} onChange={(e) => setDomain(e.target.value)} options={DETAIL_DOMAINS.map((d) => ({ value: d, label: `${d} · ${domainInfo(d)?.name}${p.specs[d]?.vars.length ? ` (${p.specs[d].vars.length} vars)` : ''}` }))} />}>
        <p className="text-xs text-lab-text-muted">{domainInfo(domain)?.cls} · {domainInfo(domain)?.structure}. {(() => { const ms = MISSIONS.filter((m) => m.domains.includes(domain)); return ms.length ? `Scored by mission${ms.length > 1 ? 's' : ''} ${ms.map((m) => m.id).join(' and ')} against a hidden reference.` : 'Free practice: no mission scores this domain.' })()} Trial design domains (TA, TE, TV, TI, TS) are built as tables on the Trial design tab.</p>
        {!spec && <Btn tone="solid" onClick={start}>Start mapping {domain}</Btn>}
      </Panel>
      {spec && <Workspace key={domain} domain={domain} spec={spec} data={data} />}
    </div>
  )
}

function Workspace({ domain, spec, data }: { domain: string; spec: DomainSpec; data: ReturnType<typeof useData> }) {
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
  const built = useMemo(() => build(spec, data), [spec, data, JSON.stringify(spec)])
  const updDom = (fn: (s: DomainSpec) => void, what?: string) => act((pp) => { fn(pp.specs[domain]); if (what) log(pp, `${domain}: ${what}`) })
  // Rule, filter and transpose edits go to the active source; the variable list and sort keys belong to the domain.
  const upd = (fn: (s: DomainSpec) => void, what?: string) => act((pp) => { const s = pp.specs[domain]; fn((pi === 0 ? s : s.parts![pi - 1]) as DomainSpec); if (what) log(pp, `${domain}${pi ? ` source ${pi + 1}` : ''}: ${what}`) })
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
      <SuppEditor spec={spec} fields={fields} built={built} updDom={updDom} />
      <Preview built={built} spec={spec} />
      <CodeView spec={spec} />
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
function SuppEditor({ spec, fields, built, updDom }: { spec: DomainSpec; fields: string[]; built: ReturnType<typeof build>; updDom: (fn: (s: DomainSpec) => void, what?: string) => void }) {
  const q = spec.supp ?? []
  const set = (i: number, patch: Partial<SuppQual>, what?: string) => updDom((s) => { Object.assign(s.supp![i], patch) }, what)
  const bad = (x: SuppQual) => !/^[A-Z][A-Z0-9]{0,7}$/.test(x.qnam) ? 'QNAM: up to 8 capital letters or digits, starting with a letter' : x.qlabel.length > 40 ? 'QLABEL: at most 40 characters' : spec.vars.includes(x.qnam) ? `${x.qnam} is a standard variable of ${spec.domain}: it belongs in the domain, not SUPP${spec.domain}` : x.expr.trim() ? ruleError({ kind: 'expr', expr: x.expr }, fields) : ''
  return (
    <Panel title={`Supplemental qualifiers · SUPP${spec.domain}`} sub={`For collected or derived values with no variable in ${spec.domain}. Use them sparingly: a value with a standard variable goes there. ${built.supp ? `${built.supp.rows.length} SUPP${spec.domain} records.` : ''}`}
      right={<Btn tone="grey" className="py-0.5" onClick={() => updDom((s) => { s.supp = [...(s.supp ?? []), { qnam: '', qlabel: '', expr: '', qorig: 'Derived' }] }, 'added a supplemental qualifier')}>+ Add a qualifier</Btn>}>
      {q.length === 0 ? <p className="text-xs text-lab-text-muted">No supplemental qualifiers.</p> : (
        <div className="space-y-2">
          {q.map((x, i) => {
            const err = bad(x)
            return (
              <div key={i} className="rounded border border-lab-line p-2 space-y-1.5">
                <div className="flex flex-wrap gap-2 items-center text-xs">
                  <input aria-label={`QNAM ${i + 1}`} className={ic('w-28 font-mono text-xs py-1')} defaultValue={x.qnam} onBlur={(e) => set(i, { qnam: e.target.value.toUpperCase().trim() }, `QNAM ${e.target.value.toUpperCase()}`)} placeholder="QNAM" />
                  <input aria-label={`QLABEL ${i + 1}`} className={ic('w-72 text-xs py-1')} defaultValue={x.qlabel} onBlur={(e) => set(i, { qlabel: e.target.value })} placeholder="QLABEL (≤ 40 characters)" />
                  <Select aria-label={`QORIG ${i + 1}`} className="w-32 text-xs py-1" value={x.qorig} onChange={(e) => set(i, { qorig: e.target.value as SuppQual['qorig'] })} options={QORIG.map((o) => ({ value: o, label: o }))} />
                  <input aria-label={`QEVAL ${i + 1}`} className={ic('w-36 text-xs py-1')} defaultValue={x.qeval ?? ''} onBlur={(e) => set(i, { qeval: e.target.value || undefined })} placeholder="QEVAL (optional)" />
                  <Btn tone="red" className="py-0.5" onClick={() => updDom((s) => { s.supp!.splice(i, 1); if (!s.supp!.length) delete s.supp }, `removed qualifier ${x.qnam}`)}>Remove</Btn>
                </div>
                <input aria-label={`QVAL expression ${i + 1}`} className={ic('w-full font-mono text-xs py-1')} defaultValue={x.expr} onBlur={(e) => set(i, { expr: e.target.value.trim() }, `${x.qnam} expression`)} placeholder="QVAL: an expression on the parent record, e.g. if(studyday(AESTDTC, dm('RFXSTDTC')) >= 1, 'Y', 'N')" />
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
function CodeView({ spec }: { spec: DomainSpec }) {
  const [lang, setLang] = useState<'R' | 'SAS' | ''>('')
  const code = lang === 'R' ? toR(spec) : lang === 'SAS' ? toSAS(spec) : ''
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
