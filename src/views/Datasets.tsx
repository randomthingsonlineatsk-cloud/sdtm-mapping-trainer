import { useMemo, useState } from 'react'
import { useStore } from '../state'
import { useNav } from '../App'
import { build, csv } from '../domain/engine'
import { check, summarise, RULES } from '../domain/conformance'
import { referenceSpec } from '../domain/reference'
import { domainInfo } from '../domain/standards'
import { download } from '../domain/store'
import { Panel, Pill, Btn, Select, Table, Stat, ic } from './ui'
import { useData } from './shared'

export default function Datasets() {
  const { p, tick } = useStore()
  const nav = useNav()
  const data = useData()
  const domains = Object.keys(p.specs).filter((d) => p.specs[d].vars.length)
  const [domain, setDomain] = useState(nav.arg && domains.includes(nav.arg) ? nav.arg : domains[0] ?? '')
  const [subj, setSubj] = useState('')
  const [page, setPage] = useState(0)
  const [row, setRow] = useState<number | null>(null)
  const built = useMemo(() => (domain ? build(p.specs[domain], data) : null), [domain, data, tick])
  const dm = useMemo(() => (domain && domain !== 'DM' ? (p.imported ? (p.specs.DM?.vars.length ? build(p.specs.DM, data) : undefined) : build(referenceSpec('DM', p.version), data)) : undefined), [domain, data, tick])
  const findings = useMemo(() => (built ? check(built, p.version, dm) : []), [built, dm])
  if (!domains.length) return <Panel title="Datasets & checks" sub="No datasets yet."><p className="text-sm">Map a domain on the Mapping tab first.</p></Panel>
  if (!built) return null
  const rows = built.rows.map((r, i) => ({ r, i })).filter((x) => !subj || x.r.USUBJID?.includes(subj))
  const per = 50, pages = Math.max(1, Math.ceil(rows.length / per))
  const sum = summarise(findings)
  const errors = findings.filter((f) => f.sev === 'Error').length
  return (
    <div className="space-y-4">
      <Panel title="Datasets & checks" sub="Your datasets as built from your mappings, with the Phase 1 conformance checks. Click a finding to see its record." right={<Select aria-label="Dataset" className="w-56" value={domain} onChange={(e) => { setDomain(e.target.value); setPage(0); setRow(null) }} options={domains.map((d) => ({ value: d, label: `${d} · ${domainInfo(d)?.name}` }))} />}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Records" value={built.rows.length} tone="blue" />
          <Stat label="Variables" value={built.vars.length} />
          <Stat label="Errors" value={errors} tone={errors ? 'red' : 'green'} />
          <Stat label="Warnings" value={findings.length - errors} tone={findings.length - errors ? 'amber' : 'green'} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => download(`${domain.toLowerCase()}.csv`, csv(built), 'text/csv')}>Download {domain.toLowerCase()}.csv</Btn>
          <span className="text-[11px] text-lab-text-muted self-center">XPT v5 and Dataset-JSON v1.1 exports arrive in Phase 2.</span>
        </div>
      </Panel>
      <Panel title="Conformance findings" sub={`Rules modelled on the public CDISC conformance rules and the FDA validator rules${dm && !p.imported ? '; other domains are checked against the study’s reference DM' : ''}.`}>
        <Table head={['Rule', 'Severity', 'Variable', 'Records', 'First example', '']} rows={sum.map((s) => [
          <span className="font-mono" title={RULES.find((r) => r.id === s.rule)?.basis}>{s.rule}</span>, <Pill tone={s.sev === 'Error' ? 'red' : 'amber'}>{s.sev}</Pill>, <span className="font-mono">{s.variable}</span>, s.count, s.first.msg,
          s.first.row !== undefined ? <Btn tone="grey" className="py-0.5" onClick={() => { const i = s.first.row!; setSubj(''); setPage(Math.floor(i / per)); setRow(i) }}>Show</Btn> : '',
        ])} empty="No findings. Clean." />
        <details className="text-xs"><summary className="cursor-pointer text-lab-text-muted">All Phase 1 rules</summary><Table className="mt-2" head={['Rule', 'Severity', 'Checks', 'Basis']} rows={RULES.map((r) => [<span className="font-mono">{r.id}</span>, r.sev, r.text, r.basis])} /></details>
      </Panel>
      <Panel title={`${domain} · ${rows.length} records`} right={<input aria-label="Filter by USUBJID" className={ic('w-56 text-xs')} value={subj} onChange={(e) => { setSubj(e.target.value); setPage(0) }} placeholder="Filter: part of USUBJID" />}>
        <Table head={['#', ...built.vars]} rows={rows.slice(page * per, page * per + per).map(({ r, i }) => [<span className={`font-mono ${row === i ? 'text-lab-amber' : 'text-lab-text-muted'}`}>{i + 1}{row === i ? ' ◀' : ''}</span>, ...built.vars.map((v) => <span className="font-mono whitespace-nowrap">{r[v]}</span>)])} />
        <div className="flex items-center gap-2 text-xs"><Btn tone="grey" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Btn><span>Page {page + 1} of {pages}</span><Btn tone="grey" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</Btn></div>
      </Panel>
    </div>
  )
}
