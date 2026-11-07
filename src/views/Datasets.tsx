import { useMemo, useState } from 'react'
import { useStore } from '../state'
import { useNav } from '../App'
import { build, csv, type Built } from '../domain/engine'
import { check, summarise, RULES, RULE_SETS, severityIn, type RuleSet } from '../domain/conformance'
import { designBuilt, deriveSE, DESIGN_SORT } from '../domain/design'
import { domainInfo, TRIAL_DESIGN, isRel, relLabel, relName } from '../domain/standards'
import { toXpt, toDatasetJson } from '../domain/exports'
import { specRows, specCsv, valueLevel } from '../domain/spec'
import { SORT } from '../domain/reference'
import { log, refSpecFor } from '../domain/project'
import { download } from '../domain/store'
import { Panel, Pill, Btn, Select, Table, Stat, Tabs, ic } from './ui'
import { useData, fieldsOf } from './shared'
import { compareDatasets } from '../domain/qc'
import { RuleHelp } from './RuleHelp'
import { allDatasets } from '../domain/datasets'
import { buildRelrec, checkRelrec } from '../domain/relrec'
import { studyData } from '../domain/reference'

const SEV_TONE = { Reject: 'purple', Error: 'red', Warning: 'amber' } as const
function saveBytes(name: string, bytes: Uint8Array) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/octet-stream' }))
  const a = document.createElement('a'); a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function Datasets() {
  const { p, act, tick } = useStore()
  const nav = useNav()
  const data = useData()
  const [tab, setTab] = useState<'data' | 'spec'>('data')
  // Every dataset the project has: mapped domains and their SUPP--, the trial design tables, and SE.
  const all = useMemo(() => allDatasets(p, data), [data, tick])
  const names = [...all.keys()]
  const [domain, setDomain] = useState(nav.arg && names.includes(nav.arg) ? nav.arg : names.find((n) => n !== 'SE') ?? names[0] ?? '')
  const ctx = useMemo(() => {
    const dm = p.imported ? (p.specs.DM?.vars.length ? all.get('DM') : undefined) : build(refSpecFor(p, 'DM'), data, p.version)
    return { dm, ta: all.get('TA'), tv: all.get('TV'), ts: all.get('TS'), set: p.ruleSet }
  }, [all, p.ruleSet])
  const built = all.get(domain)
  const findings = useMemo(() => {
    if (!built) return []
    if (domain === 'RELREC') return checkRelrec(built, Object.fromEntries([...all].filter(([k]) => p.specs[k])))
    const own = isRel(domain) ? domain.replace(/^(SUPP|NS)/, '') : domain
    const target = all.get(own) ?? built
    return check(target, p.version, own === 'DM' ? { ...ctx, dm: undefined } : ctx).filter((f) => (isRel(domain) ? f.domain === domain : !isRel(f.domain)))
  }, [built, ctx])
  const setRules = (r: RuleSet) => act((pp) => { pp.ruleSet = r; log(pp, `Rule set: ${r}`) })
  if (!names.length || !built) return <Panel title="Datasets & checks" sub="No datasets yet."><p className="text-sm">Map a domain on the Mapping tab first.</p></Panel>
  return (
    <div className="space-y-4">
      <Panel title="Datasets & checks" sub="Your datasets as built from your mappings and trial design tables, with the conformance checks of the rule set you choose."
        right={<Select aria-label="Dataset" className="w-64" value={domain} onChange={(e) => setDomain(e.target.value)} options={names.map((d) => ({ value: d, label: `${d} · ${isRel(d) ? relLabel(d) : domainInfo(d)?.name ?? d}${d === 'SE' ? ' (derived)' : ''}` }))} />}>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Rule set">
          <span className="text-xs text-lab-text-muted">Rule set</span>
          {RULE_SETS.map((r) => <Btn key={r.id} tone={p.ruleSet === r.id ? 'solid' : 'grey'} className="py-0.5" aria-pressed={p.ruleSet === r.id} onClick={() => setRules(r.id)}>{r.name}</Btn>)}
          <span className="text-[11px] text-lab-text-muted">{RULE_SETS.find((r) => r.id === p.ruleSet)?.note}</span>
        </div>
        <Tabs tabs={[{ id: 'data' as const, label: 'Datasets and findings' }, { id: 'spec' as const, label: 'Mapping specification' }]} value={tab} onChange={setTab} />
      </Panel>
      {tab === 'data' && !p.imported && (p.transfer ?? 1) === 2 && p.specs[domain]?.vars.length ? <SinceT1 domain={domain} built={built} /> : null}
      {tab === 'data' ? <DataTab built={built} findings={findings} /> : <SpecTab all={all} />}
    </div>
  )
}

function DataTab({ built, findings }: { built: Built; findings: ReturnType<typeof check> }) {
  const { p } = useStore()
  const [subj, setSubj] = useState('')
  const [page, setPage] = useState(0)
  const [row, setRow] = useState<number | null>(null)
  const [report, setReport] = useState<string[] | null>(null)
  const [explain, setExplain] = useState<string | null>(null)
  const domain = built.domain
  const rows = built.rows.map((r, i) => ({ r, i })).filter((x) => !subj || x.r.USUBJID?.includes(subj))
  const per = 50, pages = Math.max(1, Math.ceil(rows.length / per))
  const sum = summarise(findings)
  const count = (s: string) => findings.filter((f) => f.sev === s).length
  const keys = (DESIGN_SORT[domain] ?? SORT[domain] ?? (isRel(domain) ? (domain.startsWith('NS') ? ['STUDYID', 'RDOMAIN', 'USUBJID', 'IDVAR', 'IDVARVLN'] : ['STUDYID', 'RDOMAIN', 'USUBJID', 'IDVAR', 'IDVARVAL', 'QNAM']) : ['USUBJID'])).filter((k) => built.vars.includes(k))
  const xpt = () => { const r = toXpt(built, p.version); saveBytes(`${domain.toLowerCase()}.xpt`, r.bytes); setReport(r.report.warnings) }
  return (
    <>
      <Panel title={`${domain} · ${built.rows.length} records`}>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Stat label="Records" value={built.rows.length} tone="blue" />
          <Stat label="Variables" value={built.vars.length} />
          <Stat label="Reject" value={count('Reject')} tone={count('Reject') ? 'purple' : 'green'} />
          <Stat label="Errors" value={count('Error')} tone={count('Error') ? 'red' : 'green'} />
          <Stat label="Warnings" value={count('Warning')} tone={count('Warning') ? 'amber' : 'green'} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={xpt}>Download {domain.toLowerCase()}.xpt (SAS V5 transport)</Btn>
          <Btn onClick={() => download(`${domain.toLowerCase()}.json`, JSON.stringify(toDatasetJson(built, p.version, keys), null, 1))}>Download {domain.toLowerCase()}.json (Dataset-JSON v1.1)</Btn>
          <Btn tone="grey" onClick={() => download(`${domain.toLowerCase()}.csv`, csv(built), 'text/csv')}>CSV</Btn>
        </div>
        <p className="text-[11px] text-lab-text-muted">XPT version 5 is the transport format FDA and PMDA require: names up to 8 characters, labels up to 40, character values up to 200 bytes, ASCII only. Dataset-JSON is CDISC’s JSON exchange format; its key sequence here is {keys.join(', ') || 'none'}.</p>
        {report && <div className="text-xs" role="status">{report.length ? <><p className="text-lab-amber">Exported with {report.length} warning{report.length === 1 ? '' : 's'}:</p><ul className="list-disc pl-5 text-lab-text-muted">{report.map((w) => <li key={w}>{w}</li>)}</ul></> : <p className="text-lab-cdsco">Exported: the dataset meets the XPT v5 limits.</p>}</div>}
      </Panel>
      <Panel title="Conformance findings" sub={`${p.ruleSet} rule set${!p.imported && domain !== 'DM' ? '; subject checks run against the study’s reference DM' : ''}. Reject: the submission would be refused. Error: must be fixed or explained. Warning: review.`}>
        {explain && <RuleHelp id={explain} onClose={() => setExplain(null)} />}
        <Table head={['Rule', 'Severity', 'Variable', 'Records', 'First example', '']} rows={sum.map((s) => [
          <button className="font-mono underline" aria-label={`How to fix ${s.rule}`} onClick={() => setExplain(s.rule)}>{s.rule}</button>, <Pill tone={SEV_TONE[s.sev]}>{s.sev}</Pill>, <span className="font-mono">{s.variable}</span>, s.count, s.first.msg,
          s.first.row !== undefined ? <Btn tone="grey" className="py-0.5" onClick={() => { const i = s.first.row!; setSubj(''); setPage(Math.floor(i / per)); setRow(i) }}>Show</Btn> : '',
        ])} empty="No findings. Clean." />
        <details className="text-xs"><summary className="cursor-pointer text-lab-text-muted">All rules and their severity in each rule set</summary>
          <Table className="mt-2" head={['Rule', 'CDISC', 'FDA', 'PMDA', 'Checks', 'Basis']} rows={RULES.map((r) => [<button className="font-mono underline" onClick={() => setExplain(r.id)}>{r.id}</button>, ...(['CDISC', 'FDA', 'PMDA'] as RuleSet[]).map((s) => { const v = severityIn(r.id, s); return v ? <Pill tone={SEV_TONE[v]}>{v}</Pill> : <span className="text-lab-text-muted">–</span> }), r.text, r.basis])} />
        </details>
      </Panel>
      <Panel title={`${domain} records`} right={<input aria-label="Filter by USUBJID" className={ic('w-56 text-xs')} value={subj} onChange={(e) => { setSubj(e.target.value); setPage(0) }} placeholder="Filter: part of USUBJID" />}>
        <Table head={['#', ...built.vars]} rows={rows.slice(page * per, page * per + per).map(({ r, i }) => [<span className={`font-mono ${row === i ? 'text-lab-amber' : 'text-lab-text-muted'}`}>{i + 1}{row === i ? ' ◀' : ''}</span>, ...built.vars.map((v) => <span className="font-mono whitespace-nowrap">{r[v]}</span>)])} />
        <div className="flex items-center gap-2 text-xs"><Btn tone="grey" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Btn><span>Page {page + 1} of {pages}</span><Btn tone="grey" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</Btn></div>
      </Panel>
    </>
  )
}

// The mapping specification: what a Define-XML is generated from. One line per dataset variable
// with its origin (Define-XML 2.1 origin types), source and derivation, plus value-level metadata
// for each test of a wide-to-tall mapping.
function SpecTab({ all }: { all: Map<string, Built> }) {
  const { p } = useStore()
  const rows = Object.keys(p.specs).sort().filter((d) => p.specs[d].vars.length && all.get(d)).flatMap((d) => {
    const s = p.specs[d]
    const raw = [s.source, ...(s.parts ?? []).map((x) => x.source)].flatMap((f) => fieldsOf(p, f).map((x) => x.name))
    return specRows(s, all.get(d)!, p.version, raw)
  })
  const supp = Object.keys(p.specs).sort().flatMap((d) => (p.specs[d].supp ?? []).map((q) => ({ d, q })))
  const ns = p.version !== '3.4'
  const vlm = Object.keys(p.specs).sort().flatMap((d) => valueLevel(p.specs[d]).map((v) => ({ d, ...v })))
  return (
    <>
      <Panel title="Variable-level metadata" sub="Generated from your rules. Origin follows the Define-XML 2.1 origin types: Collected (from the CRF or a vendor file, with the source), Derived, Assigned or Not Available."
        right={<Btn onClick={() => download(`${p.study}_sdtm_spec.csv`, specCsv(rows), 'text/csv')}>Download the specification (CSV)</Btn>}>
        <Table head={['Dataset', 'Variable', 'Label', 'Type', 'Length', 'Core', 'Codelist', 'Origin', 'Source', 'Method / derivation']} rows={rows.map((r) => [r.dataset, <span className="font-mono">{r.variable}</span>, r.label, r.type, r.length, r.core, r.codelist, r.origin, <span className="font-mono text-[11px]">{r.source}</span>, <span className="font-mono text-[11px]">{r.method}</span>])} empty="Map a domain first." />
      </Panel>
      <Panel title="Value-level metadata" sub="For findings domains collected wide: where each test’s result comes from.">
        <Table head={['Dataset', 'Test code', 'Raw result', 'Unit']} rows={vlm.map((v) => [v.d, <span className="font-mono">{v.test}</span>, <span className="font-mono">{v.field}</span>, v.unit])} empty="No wide-to-tall mappings." />
      </Panel>
      <Panel title={ns ? 'Non-standard variables' : 'Supplemental qualifiers'} sub={ns ? 'SDTMIG v4.0 draft: each non-standard variable is a column of its NS-- dataset, with its label, type and origin in define.xml.' : 'Each QNAM in SUPP--, with its label, origin and evaluator.'}>
        <Table head={ns ? ['Dataset', 'Variable', 'Label', 'Origin', 'Evaluator', 'Derivation'] : ['Dataset', 'QNAM', 'QLABEL', 'QORIG', 'QEVAL', 'Derivation']} rows={supp.map(({ d, q }) => [relName(d, p.version), <span className="font-mono">{q.qnam}</span>, q.qlabel, q.qorig, q.qeval ?? '', <span className="font-mono text-[11px]">{q.expr}</span>])} empty="None." />
      </Panel>
    </>
  )
}

// The delivery comparison: this dataset built from the same mapping on transfer 1, against the
// dataset now. New, removed and changed records should each trace back to a change in the raw
// data (Raw data tab); anything else means the mapping behaves differently on the new data.
function SinceT1({ domain, built }: { domain: string; built: Built }) {
  const { p } = useStore()
  const c = useMemo(() => compareDatasets(build(p.specs[domain], studyData(1), p.version), built, SORT[domain] ?? ['USUBJID']), [built])
  return (
    <Panel title={`Changes since transfer 1 · ${domain}`} sub="Your mapping run on transfer 1 against the same mapping on transfer 2, matched by the key variables. Every change should trace back to a change in the raw data.">
      <p className="text-sm">{c.baseObs} records in transfer 1, {c.compareObs} now: {c.obsOnlyCompare.length} new, {c.obsOnlyBase.length} no longer present, {c.diffs.length ? `${c.unequalValues} changed values in ${c.diffs.map((d) => `${d.v} (${d.count})`).join(', ')}` : 'no changed values'}.</p>
      {(c.obsOnlyCompare.length > 0 || c.obsOnlyBase.length > 0) && <Table head={['Key', 'Change']} rows={[...c.obsOnlyCompare.slice(0, 10).map((k) => [<span className="font-mono text-[11px]">{k}</span>, 'New in transfer 2']), ...c.obsOnlyBase.slice(0, 10).map((k) => [<span className="font-mono text-[11px]">{k}</span>, 'Not in transfer 2'])]} />}
      {c.diffs.length > 0 && <Table head={['Variable', 'Key', 'Transfer 1', 'Transfer 2']} rows={c.diffs.flatMap((d) => d.examples.slice(0, 3).map((e) => [<span className="font-mono">{d.v}</span>, <span className="font-mono text-[11px]">{e.key}</span>, <span className="font-mono">{e.base || '(null)'}</span>, <span className="font-mono">{e.compare || '(null)'}</span>]))} />}
    </Panel>
  )
}
