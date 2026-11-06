import { useState } from 'react'
import { useStore } from '../state'
import { FORM_INFO } from '../domain/seed'
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
      <Panel title={`${form} · ${rows.length} rows`} right={<input aria-label="Filter by subject" className={ic('w-48 text-xs')} value={subj} onChange={(e) => { setSubj(e.target.value); setPage(0) }} placeholder="Filter: subject, e.g. 101-003" />}>
        <Table head={fields.map((f) => f.name)} rows={rows.slice(page * per, page * per + per).map((r) => fields.map((f) => <span className="font-mono whitespace-nowrap">{r[f.name] ?? ''}</span>))} />
        <div className="flex items-center gap-2 text-xs"><button className="underline disabled:opacity-40" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1} of {pages}</span><button className="underline disabled:opacity-40" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</button></div>
      </Panel>
    </div>
  )
}
