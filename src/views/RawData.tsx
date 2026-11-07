import { useState } from 'react'
import { useStore } from '../state'
import { FORM_INFO, raw } from '../domain/seed'
import { rawChanges, byField } from '../domain/delivery'
import { TransferSwitch } from './Transfer'
import { Panel, Pill, Select, Table, ic } from './ui'
import { useData, formsOf, formName, fieldsOf } from './shared'

export default function RawData() {
  const { p } = useStore()
  const data = useData()
  const forms = formsOf(p)
  const [form, setForm] = useState(forms[0])
  const [subj, setSubj] = useState('')
  const [page, setPage] = useState(0)
  const all = data.forms[form] ?? []
  const rows = all.filter((r) => !subj || r.SUBJID?.includes(subj))
  const fields = fieldsOf(p, form)
  const per = 50, pages = Math.max(1, Math.ceil(rows.length / per))
  const info = p.imported ? undefined : FORM_INFO[form]
  return (
    <div className="space-y-4">
      <Panel title="Raw data" sub="The data as it leaves the EDC and the IRT system, before any SDTM mapping. Read-only." right={<Select aria-label="Form" className="w-72" value={form} onChange={(e) => { setForm(e.target.value); setPage(0) }} options={forms.map((f) => ({ value: f, label: `${f} · ${formName(p, f)} (${(data.forms[f] ?? []).length})` }))} />}>
        {info && <p className="text-sm">{info.note} <Pill tone={info.source === 'IRT' ? 'purple' : 'blue'}>{info.source}</Pill></p>}
        {fields.some((f) => f.label) && <details className="text-xs"><summary className="cursor-pointer text-lab-text-muted">Field labels</summary><Table className="mt-2" head={['Field', 'Label on the CRF']} rows={fields.map((f) => [<span className="font-mono">{f.name}</span>, f.label])} /></details>}
      </Panel>
      {!p.imported && <Changes />}
      <Panel title={`${form} · ${rows.length} rows`} right={<input aria-label="Filter by subject" className={ic('w-48 text-xs')} value={subj} onChange={(e) => { setSubj(e.target.value); setPage(0) }} placeholder="Filter: subject, e.g. 101-003" />}>
        <Table head={fields.map((f) => f.name)} rows={rows.slice(page * per, page * per + per).map((r) => fields.map((f) => <span className="font-mono whitespace-nowrap">{r[f.name] ?? ''}</span>))} />
        <div className="flex items-center gap-2 text-xs"><button className="underline disabled:opacity-40" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1} of {pages}</span><button className="underline disabled:opacity-40" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</button></div>
      </Panel>
    </div>
  )
}

// What changed between transfer 1 and transfer 2, by form: records added (late data entry),
// removed (deleted after a query) and changed (query corrections, re-coding, unit changes).
function Changes() {
  const ch = rawChanges(raw(1).forms, raw(2).forms)
  const [open, setOpen] = useState<string | null>(null)
  const show = (r: Record<string, string>) => Object.entries(r).filter(([k, v]) => k !== '__id' && k !== 'SUBJID' && v).slice(0, 6).map(([k, v]) => `${k}=${v}`).join('  ')
  return (
    <Panel title="Data transfers" sub="Records are matched by their database record ID. Review what changed before re-running SDTM: every change should be explainable, and should show up where expected in the datasets.">
      <TransferSwitch />
      <Table head={['Form', 'Added', 'Removed', 'Changed values', 'Fields changed', '']} rows={ch.map((f) => [
        <span className="font-mono">{f.form}</span>, f.added.length, f.removed.length, f.changed.length,
        <span className="text-xs">{byField(f.changed).map((x) => `${x.field} (${x.count})`).join(', ')}</span>,
        <button className="underline text-xs" onClick={() => setOpen(open === f.form ? null : f.form)}>{open === f.form ? 'Hide' : 'Details'}</button>,
      ])} empty="No differences." />
      {open && (() => {
        const f = ch.find((x) => x.form === open)!
        return <div className="space-y-2 text-xs">
          {f.added.length > 0 && <><p className="font-semibold">Added in transfer 2</p><Table head={['Record', 'Subject', 'Content']} rows={f.added.slice(0, 20).map((r) => [<span className="font-mono">{r.__id}</span>, r.SUBJID, <span className="font-mono text-[11px]">{show(r)}</span>])} /></>}
          {f.removed.length > 0 && <><p className="font-semibold">Removed in transfer 2</p><Table head={['Record', 'Subject', 'Content']} rows={f.removed.slice(0, 20).map((r) => [<span className="font-mono">{r.__id}</span>, r.SUBJID, <span className="font-mono text-[11px]">{show(r)}</span>])} /></>}
          {f.changed.length > 0 && <><p className="font-semibold">Changed values (first 30)</p><Table head={['Record', 'Subject', 'Field', 'Transfer 1', 'Transfer 2']} rows={f.changed.slice(0, 30).map((c) => [<span className="font-mono">{c.id}</span>, c.subj, <span className="font-mono">{c.field}</span>, <span className="font-mono">{c.from || '(blank)'}</span>, <span className="font-mono">{c.to || '(blank)'}</span>])} /></>}
        </div>
      })()}
    </Panel>
  )
}
