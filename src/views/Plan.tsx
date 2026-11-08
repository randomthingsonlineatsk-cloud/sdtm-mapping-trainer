import { useState } from 'react'
import { useStore } from '../state'
import { useNav } from '../App'
import { startPlan, currentVersion, nextVersion, incomplete, mismatches, diffRows, planCsv, PLAN_ORIGINS, type Plan, type PlanRow, type PlanOrigin } from '../domain/plan'
import { varsOf, detailDomains, domainInfo } from '../domain/standards'
import { log } from '../domain/project'
import { download } from '../domain/store'
import { Panel, Pill, Btn, Select, Table, ic } from './ui'
import { formsOf, fieldsOf } from './shared'

export default function PlanView() {
  const { p, act } = useStore()
  const { go } = useNav()
  const [domain, setDomain] = useState('DM')
  const [approver, setApprover] = useState('')
  const [reason, setReason] = useState('')
  const [addVar, setAddVar] = useState('')
  const plan = p.plan?.[domain]
  const meta = varsOf(domain, p.version)
  const metaOf = (v: string) => meta.find((m) => m.name === v)
  const upd = (fn: (pl: Plan) => void, what?: string) => act((pp) => { fn(pp.plan![domain]); if (what) log(pp, `Specification ${domain}: ${what}`) })
  const forms = formsOf(p)
  const allFields = forms.flatMap((f) => fieldsOf(p, f).map((x) => `${f}.${x.name}`))
  const cur = plan ? currentVersion(plan) : undefined
  const todo = plan ? incomplete(plan) : []
  const editable = plan?.status === 'Draft'
  const rawFields = Object.fromEntries(forms.map((f) => [f, fieldsOf(p, f).map((x) => x.name)]))
  const mm = cur && p.specs[domain]?.vars.length ? mismatches(cur.rows, p.specs[domain], rawFields) : null
  return (
    <div className="space-y-4">
      <Panel title="Mapping specification" sub="Write the specification before programming, as companies do: for each variable its origin, the raw field it comes from or how it is derived. It is reviewed and approved by someone other than the author, programmed against, and every later change becomes a new version with a reason."
        right={<Select aria-label="Domain to specify" className="w-64" value={domain} onChange={(e) => setDomain(e.target.value)} options={detailDomains(p.version).map((d) => ({ value: d, label: `${d} · ${domainInfo(d, p.version)?.name}${p.plan?.[d] ? ` (${currentVersion(p.plan[d])?.version ?? 'draft'})` : ''}` }))} />}>
        {!plan ? <Btn tone="solid" onClick={() => act((pp) => { (pp.plan ??= {})[domain] = startPlan(domain, pp.version, pp.userId); log(pp, `Specification ${domain} started`) })}>Start the specification of {domain}</Btn> : (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Pill tone={plan.status === 'Approved' ? 'green' : plan.status === 'In review' ? 'amber' : 'blue'}>{plan.status === 'Draft' ? (cur ? `Revision ${nextVersion(plan)} in draft` : 'Version 0.1 draft') : plan.status === 'In review' ? `Version ${nextVersion(plan)} in review` : `Version ${cur!.version} approved`}</Pill>
            {cur && <span className="text-xs text-lab-text-muted">Last approved: {cur.version}, {cur.utc.slice(0, 10)}, by {cur.approver}{cur.reason ? ` · ${cur.reason}` : ''}</span>}
            <span className="text-xs text-lab-text-muted">Author: <span className="font-mono">{plan.author}</span></span>
            <Btn tone="grey" className="py-0.5" onClick={() => download(`${domain.toLowerCase()}_specification.csv`, planCsv(plan, Object.fromEntries(meta.map((m) => [m.name, m.label]))), 'text/csv')}>Download (CSV)</Btn>
          </div>
        )}
      </Panel>

      {plan && <>
        <Panel title={`${domain} variables · ${plan.rows.length}`} sub={editable ? 'Origin: Collected (name the raw field as FORM.FIELD), Derived (describe the derivation), Assigned (the value, set by the sponsor), Protocol (from the protocol, e.g. trial design) or Not Available.' : 'Read-only while in review or approved. Start a revision to change it.'}>
          <datalist id="plan-fields">{allFields.map((f) => <option key={f} value={f} />)}</datalist>
          <Table head={['Variable', 'Label', 'Core', 'Origin', 'Source (FORM.FIELD)', 'Method / derivation', '']} rows={plan.rows.map((r, i) => {
            const m = metaOf(r.variable)
            const set = (patch: Partial<PlanRow>) => upd((pl) => { Object.assign(pl.rows[i], patch) })
            return [
              <span className="font-mono">{r.variable}</span>, <span className="text-xs">{m?.label}</span>, m?.core ?? '',
              editable ? <Select aria-label={`Origin of ${r.variable}`} className="w-36 text-xs py-1" value={r.origin} onChange={(e) => set({ origin: e.target.value as PlanOrigin })} options={[{ value: '', label: '—' }, ...PLAN_ORIGINS.map((o) => ({ value: o, label: o }))]} /> : r.origin,
              editable ? <input key={`s${r.variable}${r.source}`} aria-label={`Source of ${r.variable}`} list="plan-fields" className={ic('w-40 font-mono text-[11px] py-1')} defaultValue={r.source} onBlur={(e) => e.target.value !== r.source && set({ source: e.target.value.trim() })} /> : <span className="font-mono text-[11px]">{r.source}</span>,
              editable ? <input key={`m${r.variable}${r.method}`} aria-label={`Method of ${r.variable}`} className={ic('w-80 text-[11px] py-1')} defaultValue={r.method} onBlur={(e) => e.target.value !== r.method && set({ method: e.target.value })} placeholder={r.origin === 'Collected' ? 'e.g. converted to ISO 8601' : ''} /> : <span className="text-[11px]">{r.method}</span>,
              editable && m?.core === 'Perm' ? <Btn tone="red" className="py-0.5" aria-label={`Remove ${r.variable}`} onClick={() => upd((pl) => { pl.rows.splice(i, 1) }, `removed ${r.variable}`)}>✕</Btn> : '',
            ]
          })} />
          {editable && <div className="flex flex-wrap gap-2 items-center">
            <Select aria-label="Permissible variable to add" className="w-64 text-xs py-1" value={addVar} onChange={(e) => setAddVar(e.target.value)} options={[{ value: '', label: 'Add a permissible variable…' }, ...meta.filter((m) => !plan.rows.some((r) => r.variable === m.name)).map((m) => ({ value: m.name, label: `${m.name} · ${m.label}` }))]} />
            <Btn tone="grey" className="py-0.5" disabled={!addVar} onClick={() => { upd((pl) => { const order = meta.map((m) => m.name); pl.rows.push({ variable: addVar, origin: '', source: '', method: '' }); pl.rows.sort((a, b) => order.indexOf(a.variable) - order.indexOf(b.variable)) }, `added ${addVar}`); setAddVar('') }}>Add</Btn>
          </div>}
        </Panel>

        <Panel title="Review and approval" sub="A specification is approved by a reviewer who did not write it. After approval, changes are made in a revision with a reason, approved again as the next version.">
          {plan.status === 'Draft' && <>
            {cur && <div className="flex gap-2 items-center"><span className="text-xs">Reason for revision {nextVersion(plan)}:</span><input aria-label="Reason for the revision" className={ic('w-96 text-xs')} defaultValue={plan.reason ?? ''} onBlur={(e) => upd((pl) => { pl.reason = e.target.value })} placeholder="e.g. Transfer 2: lab reports some results in SI units" /></div>}
            {todo.length > 0 && <ul className="list-disc pl-5 text-xs text-lab-amber">{todo.slice(0, 8).map((t) => <li key={t}>{t}</li>)}{todo.length > 8 && <li>… and {todo.length - 8} more</li>}</ul>}
            <Btn tone="solid" disabled={todo.length > 0} onClick={() => upd((pl) => { pl.status = 'In review' }, 'submitted for review')}>Submit for review</Btn>
          </>}
          {plan.status === 'In review' && <div className="flex flex-wrap gap-2 items-center">
            <input aria-label="Reviewer name" className={ic('w-56 text-xs')} value={approver} onChange={(e) => setApprover(e.target.value)} placeholder="Reviewer (not the author)" />
            <Btn tone="solid" disabled={!approver.trim() || approver.trim() === plan.author} onClick={() => { upd((pl) => { pl.versions.push({ version: nextVersion(pl), utc: new Date().toISOString(), status: 'Approved', author: pl.author, approver: approver.trim(), reason: pl.versions.length ? pl.reason ?? '' : 'First version', rows: pl.rows.map((r) => ({ ...r })) }); pl.status = 'Approved'; pl.reason = '' }, `approved by ${approver.trim()}`); setApprover('') }}>Approve version {nextVersion(plan)}</Btn>
            <Btn tone="grey" onClick={() => upd((pl) => { pl.status = 'Draft' }, 'returned to draft')}>Return to the author</Btn>
            {approver.trim() === plan.author && <span className="text-xs text-lab-red">The author cannot approve their own specification.</span>}
          </div>}
          {plan.status === 'Approved' && <div className="flex flex-wrap gap-2 items-center">
            <input aria-label="Reason for a revision" className={ic('w-96 text-xs')} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why the specification has to change" />
            <Btn disabled={!reason.trim()} onClick={() => { upd((pl) => { pl.status = 'Draft'; pl.reason = reason.trim() }, `revision started: ${reason.trim()}`); setReason('') }}>Start revision {nextVersion(plan)}</Btn>
          </div>}
          {plan.versions.length > 0 && <Table head={['Version', 'Approved (UTC)', 'Approver', 'Reason', 'Changes from the previous version']} rows={[...plan.versions].reverse().map((v) => {
            const i = plan.versions.indexOf(v), d = i ? diffRows(plan.versions[i - 1].rows, v.rows) : []
            return [<span className="font-mono">{v.version}</span>, v.utc.slice(0, 16).replace('T', ' '), v.approver, v.reason, <span className="text-[11px]">{i ? (d.length ? d.slice(0, 6).map((x) => `${x.variable}: ${x.change}`).join(' · ') + (d.length > 6 ? ` · +${d.length - 6}` : '') : 'No variable changes') : 'First version'}</span>]
          })} />}
        </Panel>

        <Panel title="Program against the approved specification" sub="Programming follows the approved version. Every difference is either a programming error or a specification that needs a revision.">
          {!cur ? <p className="text-sm text-lab-text-muted">Nothing approved yet.</p>
            : !mm ? <p className="text-sm">No {domain} program yet. <button className="underline" onClick={() => go('mapping', domain)}>Program {domain}</button></p>
            : <Table head={['Variable', 'Difference']} rows={mm.map((x) => [<span className="font-mono">{x.variable}</span>, x.what])} empty={`The ${domain} program follows specification version ${cur.version}.`} />}
        </Panel>
      </>}
    </div>
  )
}
