import { useMemo, useState } from 'react'
import { useStore } from '../state'
import { useNav } from '../App'
import { build } from '../domain/engine'
import { compareDatasets, qcItems, reportText, sharedRules } from '../domain/qc'
import { SORT } from '../domain/reference'
import { domainInfo } from '../domain/standards'
import { log, type QcResolution } from '../domain/project'
import { download } from '../domain/store'
import { Panel, Btn, Select, Table, Stat, ic } from './ui'
import { useData } from './shared'

const STATUSES: QcResolution['status'][] = ['Open', 'Production corrected', 'QC corrected', 'Explained']

export default function Qc() {
  const { p, act } = useStore()
  const { go } = useNav()
  const data = useData()
  const both = Object.keys(p.qc ?? {}).filter((d) => p.qc![d].vars.length && p.specs[d]?.vars.length).sort()
  const [domain, setDomain] = useState(both[0] ?? '')
  const d = both.includes(domain) ? domain : both[0]
  const prod = d ? p.specs[d] : undefined, qc = d ? p.qc?.[d] : undefined
  const keys = d ? SORT[d] ?? ['USUBJID'] : []
  const c = useMemo(() => (prod && qc ? compareDatasets(build(prod, data, p.version), build(qc, data, p.version), keys) : null), [JSON.stringify(prod), JSON.stringify(qc), data, p.version])
  const [open, setOpen] = useState<string | null>(null)
  const [signNote, setSignNote] = useState('')
  if (!d || !prod || !qc || !c) return (
    <Panel title="QC compare" sub="Independent QC programming: a second programmer writes the same domain from the specification, and the two datasets are compared record by record.">
      <p className="text-sm">There is nothing to compare yet. Map a domain on the Production side of the Mapping workspace, then switch to <b>QC (independent)</b> and program the same domain again without reading the production rules. Mission S10 walks you through it with a colleague’s VS.</p>
      <div className="flex gap-2"><Btn onClick={() => go('mapping')}>Open the Mapping workspace</Btn><Btn tone="grey" onClick={() => go('missions')}>Missions</Btn></div>
    </Panel>
  )
  const items = qcItems(c)
  const res = p.qcLog?.[d] ?? {}
  const shared = sharedRules(prod, qc)
  const sign = p.qcSignoff?.[d]
  const setRes = (id: string, patch: Partial<QcResolution>, what?: string) => act((pp) => {
    const L = ((pp.qcLog ??= {})[d] ??= {})
    L[id] = { ...(L[id] ?? { status: 'Open', note: '', utc: '' }), ...patch, utc: new Date().toISOString() }
    if (what) log(pp, `QC ${d}: ${what}`)
  })
  const unresolvedGone = Object.entries(res).filter(([id]) => !items.some((i) => i.id === id))
  return (
    <div className="space-y-4">
      <Panel title="QC compare" sub="Production (BASE) against your independent QC program (COMPARE), matched by the domain’s key variables. Every difference is investigated: correct whichever side is wrong, or explain why the difference is acceptable. Sign off when the comparison is clean."
        right={<Select aria-label="Domain to compare" className="w-56" value={d} onChange={(e) => setDomain(e.target.value)} options={both.map((x) => ({ value: x, label: `${x} · ${domainInfo(x)?.name}` }))} />}>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Stat label="Production records" value={c.baseObs} tone="blue" />
          <Stat label="QC records" value={c.compareObs} tone="blue" />
          <Stat label="Matched by key" value={c.matchedObs} />
          <Stat label="Unequal values" value={c.unequalValues} tone={c.unequalValues ? 'red' : 'green'} />
          <Stat label="Status" value={c.clean ? 'Clean' : 'Differences'} tone={c.clean ? 'green' : 'red'} />
        </div>
        <p className="text-xs text-lab-text-muted">Key variables: <span className="font-mono">{c.keys.join(', ')}</span>. Values are equal when the text is equal or both are the same number (1 and 1.0).</p>
        {shared.total > 0 && shared.same / shared.total > 0.5 && <p className="text-xs text-lab-amber" role="note">{shared.same} of {shared.total} derived QC rules are written exactly as in production. Independent QC means writing them from the specification and conventions; a copied rule repeats the same mistake on both sides.</p>}
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => go('mapping', d)}>Open production {d}</Btn>
          <Btn onClick={() => go('mapping', `qc:${d}`)}>Open QC {d}</Btn>
          <Btn tone="grey" onClick={() => download(`qc_compare_${d.toLowerCase()}.txt`, reportText(d, c), 'text/plain')}>Download the comparison report</Btn>
        </div>
      </Panel>

      <Panel title={`Differences to resolve · ${items.length}`} sub="Look at the examples, decide which side is right against the conventions, then fix that side. The list updates as you correct either program.">
        <Table head={['Difference', 'Resolution', 'Note', '']} rows={items.map((it) => {
          const r = res[it.id]
          const diff = c.diffs.find((x) => `values:${x.v}` === it.id)
          return [
            <div>
              <span className="font-mono text-xs">{it.what}</span>
              {open === it.id && diff && <Table className="mt-2" head={['Key', 'Production', 'QC']} rows={diff.examples.map((e) => [<span className="font-mono text-[11px]">{e.key}</span>, <span className="font-mono text-[11px]">{e.base || '(null)'}</span>, <span className="font-mono text-[11px]">{e.compare || '(null)'}</span>])} />}
              {open === it.id && it.id.startsWith('obs-only') && <ul className="mt-1 font-mono text-[11px] text-lab-text-muted">{(it.id === 'obs-only-prod' ? c.obsOnlyBase : c.obsOnlyCompare).slice(0, 12).map((k) => <li key={k}>{k}</li>)}</ul>}
            </div>,
            <Select aria-label={`Resolution for ${it.what}`} className="w-48 text-xs py-1" value={r?.status ?? 'Open'} onChange={(e) => setRes(it.id, { status: e.target.value as QcResolution['status'] }, `${it.what}: ${e.target.value}`)} options={STATUSES.map((s) => ({ value: s, label: s }))} />,
            <input aria-label={`Note for ${it.what}`} className={ic('w-64 text-xs py-1')} defaultValue={r?.note ?? ''} onBlur={(e) => e.target.value !== (r?.note ?? '') && setRes(it.id, { note: e.target.value })} placeholder="What was wrong, and where" />,
            <Btn tone="grey" className="py-0.5" onClick={() => setOpen(open === it.id ? null : it.id)}>{open === it.id ? 'Hide' : 'Examples'}</Btn>,
          ]
        })} empty="No differences: production and QC agree on every record and value." />
        {items.some((it) => res[it.id]?.status === 'Explained') && <p className="text-xs text-lab-amber">An explained difference still stops sign-off here: a comparison is clean only when the datasets agree. In practice an accepted difference is documented and the comparison re-run with that variable excluded.</p>}
        {unresolvedGone.length > 0 && <details className="text-xs"><summary className="cursor-pointer text-lab-text-muted">Resolved differences ({unresolvedGone.length})</summary>
          <Table className="mt-2" head={['Difference', 'Resolution', 'Note', 'When (UTC)']} rows={unresolvedGone.map(([id, r]) => [<span className="font-mono">{id.replace(/^values:/, '')}</span>, r.status, r.note, r.utc.slice(0, 16).replace('T', ' ')])} />
        </details>}
      </Panel>

      <Panel title="QC sign-off" sub="The QC programmer’s confirmation that the comparison is clean, filed with the validation documentation.">
        {sign && <p className="text-sm">Signed off by <span className="font-mono">{sign.by}</span> on {sign.utc.slice(0, 16).replace('T', ' ')} UTC{sign.note ? `: “${sign.note}”` : ''}.{!c.clean && <span className="text-lab-red"> Production or QC has changed since and no longer compares clean: sign off again once it is.</span>}</p>}
        <div className="flex flex-wrap gap-2 items-center">
          <input aria-label="Sign-off note" className={ic('w-96 text-xs')} value={signNote} onChange={(e) => setSignNote(e.target.value)} placeholder="e.g. Independent QC complete; 3 production issues corrected" />
          <Btn tone="solid" disabled={!c.clean} onClick={() => { act((pp) => { (pp.qcSignoff ??= {})[d] = { utc: new Date().toISOString(), by: pp.userId, note: signNote }; log(pp, `QC ${d} signed off`) }); setSignNote('') }}>Sign off QC of {d}</Btn>
          {!c.clean && <span className="text-xs text-lab-text-muted">Available when the comparison is clean.</span>}
        </div>
      </Panel>

      <Panel title="Comparison report">
        <pre className="max-h-[50vh] overflow-auto rounded border border-lab-line bg-lab-panel-strong p-3 text-[11px] leading-relaxed font-mono whitespace-pre">{reportText(d, c)}</pre>
      </Panel>
    </div>
  )
}

