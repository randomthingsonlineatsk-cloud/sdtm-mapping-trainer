import { useMemo } from 'react'
import { useStore } from '../state'
import { useNav } from '../App'
import { build, type Built } from '../domain/engine'
import { buildRelrec, checkRelrec, type RelDef, type RelSide } from '../domain/relrec'
import { log } from '../domain/project'
import { download } from '../domain/store'
import { csv } from '../domain/engine'
import { Panel, Pill, Btn, Select, Table, ic } from './ui'
import { useData, fieldsOf } from './shared'

export default function Relations() {
  const { p, act } = useStore()
  const { go } = useNav()
  const data = useData()
  const defs = p.relrec ?? []
  const mapped = Object.keys(p.specs).filter((d) => p.specs[d].vars.length).sort()
  const builts = useMemo(() => Object.fromEntries(mapped.map((d) => [d, build(p.specs[d], data, p.version)])) as Record<string, Built>, [data, JSON.stringify(p.specs), p.version])
  const rel = useMemo(() => buildRelrec(defs, builts, data), [builts, JSON.stringify(defs)])
  const findings = checkRelrec(rel, builts)
  const upd = (fn: (d: RelDef[]) => void, what?: string) => act((pp) => { fn((pp.relrec ??= [])); if (what) log(pp, `RELREC: ${what}`) })
  const keysFor = (domain: string) => {
    const s = p.specs[domain]; if (!s) return []
    const raw = [s.source, ...(s.parts ?? []).map((x) => x.source)].flatMap((f) => fieldsOf(p, f).map((x) => x.name))
    return [...new Set([...s.vars, ...raw])]
  }
  const side = (i: number, which: 'a' | 'b', s: RelSide) => (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1 items-center">
        <Select aria-label={`Rule ${i + 1} ${which === 'a' ? 'first' : 'second'} domain`} className="w-24 text-xs py-1" value={s.domain} onChange={(e) => upd((d) => { d[i][which].domain = e.target.value })} options={[{ value: '', label: '—' }, ...mapped.map((x) => ({ value: x, label: x }))]} />
        <input aria-label={`Rule ${i + 1} ${which === 'a' ? 'first' : 'second'} key`} list={`keys-${i}-${which}`} className={ic('w-36 font-mono text-xs py-1')} defaultValue={s.key} onBlur={(e) => upd((d) => { d[i][which].key = e.target.value.trim().toUpperCase() })} placeholder="key variable or raw field" />
        <datalist id={`keys-${i}-${which}`}>{keysFor(s.domain).map((k) => <option key={k} value={k} />)}</datalist>
      </div>
      <input aria-label={`Rule ${i + 1} ${which === 'a' ? 'first' : 'second'} filter`} className={ic('w-full font-mono text-[11px] py-1')} defaultValue={s.filter ?? ''} onBlur={(e) => upd((d) => { d[i][which].filter = e.target.value.trim() || undefined })} placeholder="only records where… (optional), e.g. LBTESTCD = 'ALT'" />
    </div>
  )
  const per = (id: string) => new Set(rel.rows.filter((r) => r.RELID.startsWith(id) && /^\d+$/.test(r.RELID.slice(id.length))).map((r) => `${r.USUBJID}|${r.RELID}`)).size
  return (
    <div className="space-y-4">
      <Panel title="Relationships (RELREC)" sub="RELREC records which records of different domains belong together. Each rule links records of two domains whose keys are equal for the same subject; a key can be an SDTM variable or a raw field of the record’s source row, since CRFs often link records with fields that are not submitted themselves (here CMAENO, the AE number on a medication, and AELBACC, the lab accession on an abnormal-lab AE).">
        <p className="text-xs text-lab-text-muted">Each related group gets one RELID; IDVAR is the --SEQ of each record and IDVARVAL its value. RELTYPE is used only for dataset-level relationships, so it stays null here. Mapped domains: {mapped.join(', ') || 'none yet'}.</p>
        <Btn tone="solid" onClick={() => upd((d) => { d.push({ id: `R${d.length + 1}`, label: '', a: { domain: mapped.includes('AE') ? 'AE' : mapped[0] ?? '', key: '' }, b: { domain: '', key: '' } }) }, 'added a rule')}>+ Add a relationship rule</Btn>
      </Panel>
      {defs.map((d, i) => (
        <Panel key={i} title={`Rule ${i + 1}${d.label ? ` · ${d.label}` : ''}`} right={<div className="flex gap-1 items-center"><Pill tone={per(d.id) ? 'green' : 'amber'}>{per(d.id)} groups</Pill><Btn tone="red" className="py-0.5" onClick={() => upd((x) => { x.splice(i, 1) }, `removed rule ${d.id}`)}>Remove</Btn></div>}>
          <div className="flex flex-wrap gap-2 items-center">
            <input aria-label={`Rule ${i + 1} RELID prefix`} className={ic('w-24 font-mono text-xs py-1')} defaultValue={d.id} onBlur={(e) => upd((x) => { x[i].id = e.target.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || x[i].id })} />
            <input aria-label={`Rule ${i + 1} description`} className={ic('flex-1 min-w-48 text-xs py-1')} defaultValue={d.label} onBlur={(e) => upd((x) => { x[i].label = e.target.value })} placeholder="What the relationship is, e.g. AE and the medication given for it" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><p className="text-[11px] text-lab-text-muted mb-1">Records of</p>{side(i, 'a', d.a)}</div>
            <div><p className="text-[11px] text-lab-text-muted mb-1">relate to records of</p>{side(i, 'b', d.b)}</div>
          </div>
          {rel.errors[d.id] && <p className="text-xs text-lab-red">{rel.errors[d.id].first}</p>}
        </Panel>
      ))}
      {defs.length > 0 && <Panel title={`RELREC · ${rel.rows.length} records`} right={<Btn tone="grey" className="py-0.5" onClick={() => download('relrec.csv', csv(rel), 'text/csv')}>CSV</Btn>} sub="RELREC is also on the Datasets tab with the XPT and Dataset-JSON downloads.">
        <Table head={['Rule', 'Severity', 'Records', 'First example']} rows={[...new Set(findings.map((f) => f.rule))].map((r) => { const fs = findings.filter((f) => f.rule === r); return [<span className="font-mono">{r}</span>, <Pill tone="red">{fs[0].sev}</Pill>, fs.length, fs[0].msg] })} empty="No findings." />
        <Table head={rel.vars} rows={rel.rows.slice(0, 30).map((r) => rel.vars.map((v) => <span className="font-mono whitespace-nowrap">{r[v]}</span>))} />
        <Btn tone="grey" onClick={() => go('missions')}>Mission S15</Btn>
      </Panel>}
    </div>
  )
}
