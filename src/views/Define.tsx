import { useMemo } from 'react'
import { useStore } from '../state'
import { isGlv } from '../domain/project'
import { useNav } from '../App'
import { buildDefine, toDefineXml, checkDefine, DEFINE_RULES, STYLESHEET, type DefineModel } from '../domain/define'
import { DEFINE_XSL } from '../domain/defineXsl'
import { allDatasets } from '../domain/datasets'
import { crfPages, layoutAcrf } from '../domain/acrf'
import { TRIAL_DESIGN } from '../domain/standards'
import { download } from '../domain/store'
import { Panel, Pill, Btn, Table, Stat } from './ui'
import { useData } from './shared'

export function useDefine(): { model: DefineModel; findings: ReturnType<typeof checkDefine>; all: ReturnType<typeof allDatasets> } {
  const { p, tick } = useStore()
  const data = useData()
  return useMemo(() => {
    const all = allDatasets(p, data)
    const model = buildDefine({ builts: all, specs: p.specs, version: p.version, laid: layoutAcrf(crfPages(data.forms), p.acrf ?? {}), designDomains: TRIAL_DESIGN })
    return { model, findings: checkDefine(model, all), all }
  }, [data, tick])
}

export default function Define() {
  const { p } = useStore()
  const { go } = useNav()
  const { model: m, findings } = useDefine()
  const items = new Map(m.items.map((i) => [i.oid, i]))
  const methods = new Map(m.methods.map((x) => [x.oid, x]))
  const comments = new Map(m.comments.map((x) => [x.oid, x]))
  if (!isGlv(p)) return <Panel title="define.xml" sub="Built for GLV-12-301."><p className="text-sm">Open a GLV-12-301 project to generate define.xml.</p></Panel>
  if (!m.datasets.length) return <Panel title="define.xml" sub="Nothing to describe yet."><p className="text-sm">Map a domain first.</p></Panel>
  const origin = (oid: string) => {
    const o = items.get(oid)!.origin
    return <>{o.type}{o.source ? ` (${o.source})` : ''}{o.pages?.length ? <> · aCRF p. {o.pages.join(', ')}</> : null}</>
  }
  return (
    <div className="space-y-4">
      <Panel title="define.xml" sub="Define-XML 2.1, generated from your datasets, mapping, aCRF and trial design: every dataset and variable with its metadata, the origin of each variable (collected variables point to their acrf.pdf page), a method for every derivation, value-level metadata for findings results and supplemental qualifiers, the codelists used, and links to the datasets, acrf.pdf and csdrg.pdf."
        right={<div className="flex gap-1"><Btn tone="solid" onClick={() => download('define.xml', toDefineXml(m), 'application/xml')}>Download define.xml</Btn><Btn tone="grey" onClick={() => download(STYLESHEET, DEFINE_XSL, 'application/xml')}>Stylesheet</Btn></div>}>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Stat label="Datasets" value={m.datasets.length} tone="blue" /><Stat label="Variables" value={m.datasets.reduce((a, d) => a + d.refs.length, 0)} />
          <Stat label="Methods" value={m.methods.length} /><Stat label="Codelists" value={m.codelists.length} />
          <Stat label="Findings" value={findings.length} tone={findings.some((f) => f.sev === 'Error') ? 'red' : findings.length ? 'amber' : 'green'} />
        </div>
        <p className="text-[11px] text-lab-text-muted">Standards: {m.standards.map((s) => `${s.name} ${s.version} (${s.status})`).join(' · ')}. Put define.xml, {STYLESHEET}, acrf.pdf and the .xpt files in one folder (the package on the Submission tab does this); the stylesheet renders define.xml when the folder is served, or opened in Firefox.</p>
      </Panel>
      <Panel title="Define checks" sub="Origins agree with the aCRF, codelists match the data, every derivation has a method, labels fit, keys identify records.">
        <Table head={['Check', 'Severity', 'Where', 'Finding', 'How to fix']} rows={findings.map((f) => [<span className="font-mono">{f.rule}</span>, <Pill tone={f.sev === 'Error' ? 'red' : 'amber'}>{f.sev}</Pill>, <span className="font-mono">{f.where}</span>, f.msg, <span className="text-[11px]">{DEFINE_RULES[f.rule]}{f.rule === 'DEF-001' && <> <button className="underline" onClick={() => go('acrf')}>Open the aCRF</button></>}</span>])} empty="No findings." />
      </Panel>
      <Panel title="Datasets" sub="Preview in the layout of a define.xml stylesheet. Select a dataset to jump to its variables.">
        <Table head={['Dataset', 'Description', 'Class', 'Structure', 'Keys', 'Records', 'Location']} rows={m.datasets.map((d) => [<a className="font-mono underline" href={`#${d.oid}`}>{d.name}</a>, d.label, d.cls, <span className="text-[11px]">{d.structure}</span>, <span className="font-mono text-[11px]">{d.keys.join(', ')}</span>, d.records, <span className="font-mono">{d.name.toLowerCase()}.xpt</span>])} />
      </Panel>
      {m.datasets.map((d) => (
        <section key={d.oid} id={d.oid} className="scroll-mt-4">
          <Panel title={`${d.name} · ${d.label}`} sub={`${d.cls} · ${d.structure}${d.comment ? ` · ${comments.get(d.comment)?.text}` : ''}`}>
            <Table head={['Variable', 'Label', 'Key', 'Type', 'Length', 'Role', 'Controlled terms', 'Origin', 'Derivation / comment']} rows={d.refs.map((r) => {
              const it = items.get(r.item)!
              return [<span className="font-mono">{it.name}{it.valueList && <> <a className="underline text-[11px]" href={`#${it.valueList}`}>(values)</a></>}</span>, <span className="text-[11px]">{it.label}</span>, r.key ?? '', it.dataType, it.length ?? '', <span className="text-[11px]">{r.role}</span>,
                it.codelist ? <a className="underline font-mono text-[11px]" href={`#${it.codelist}`}>{it.codelist.slice(3)}</a> : '', <span className="text-[11px]">{origin(r.item)}</span>, <span className="font-mono text-[11px]">{(r.method && methods.get(r.method)?.description) || it.origin.text || ''}</span>]
            })} />
          </Panel>
        </section>
      ))}
      <Panel title="Value-level metadata">
        {m.valueLists.map((vl) => (
          <div key={vl.oid} id={vl.oid} className="scroll-mt-4 space-y-1">
            <p className="font-mono text-xs">{vl.oid}</p>
            <Table head={['Where', 'Type', 'Length', 'Origin']} rows={vl.refs.map((r) => { const w = m.wheres.find((x) => x.oid === r.where)!; const it = items.get(r.item)!; return [<span className="font-mono text-[11px]">{w.item.split('.').pop()} = {w.values.join(', ')}</span>, it.dataType, it.length ?? '', <span className="text-[11px]">{origin(r.item)}</span>] })} />
          </div>
        ))}
      </Panel>
      <Panel title="Codelists">
        <div className="grid md:grid-cols-2 gap-3">
          {m.codelists.map((c) => (
            <div key={c.oid} id={c.oid} className="scroll-mt-4">
              <p className="text-xs font-semibold">{c.name} <span className="font-mono text-lab-text-muted">({c.oid.slice(3)}{c.extensible ? ', extensible' : ''})</span></p>
              <Table head={['Coded value', 'Decode']} rows={c.terms.map((t) => [<span className="font-mono">{t.value}</span>, t.decode ?? ''])} />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
