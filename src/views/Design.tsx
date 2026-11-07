import { useMemo, useState } from 'react'
import { useStore } from '../state'
import { useNav } from '../App'
import { designBuilt, deriveSE, type DesignRow } from '../domain/design'
import { check, summarise } from '../domain/conformance'
import { varsOf, domainInfo, CT, TRIAL_DESIGN } from '../domain/standards'
import { log } from '../domain/project'
import { STUDY } from '../domain/study'
import { Panel, Pill, Btn, Table, Tabs, TextArea, ic } from './ui'

const HELP: Record<string, string> = {
  TA: 'One record per element per arm, in order (TAETORD). TABRANCH on the element at whose end the subject is assigned to an arm; TATRANS where the next element can vary. EPOCH names the period each element belongs to.',
  TE: 'One record per element: its code, name, start rule (TESTRL), end rule (TEENRL) and planned duration (TEDUR, ISO 8601). Elements are shared by the arms that use them.',
  TV: 'One record per planned visit: VISITNUM, VISIT and the planned study day (VISITDY), with the rule for when it starts. Leave ARMCD empty when every arm has the visit.',
  TI: 'One record per inclusion and exclusion criterion: IETESTCD (up to 8 characters), IETEST (the criterion text) and IECAT. TIVERS is the protocol version of the criteria.',
  TS: 'One record per value of each trial summary parameter (several countries: several FCNTRY records, numbered by TSSEQ within the parameter). Values are CT where a codelist exists, ISO 8601 for dates and durations. A value over 200 characters continues in TSVAL1. FDA expects further parameters (REGID, OUTMSPRI, PCLAS, ADAPT, INTMODEL, INTTYPE, DCUTDTC, DCUTDESC…) and codes for the treatment and background therapy (UNII), the indication (SNOMED CT) and the class (MED-RT) in TSVALCD with TSVCDREF. A value that is unknown or not applicable goes in TSVALNF as a null flavor.',
}

export default function Design() {
  const { p, act } = useStore()
  const { go } = useNav()
  const [d, setD] = useState<string>('TA')
  const [paste, setPaste] = useState(false)
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  if (p.imported) return <Panel title="Trial design" sub="Trial design is built for GLV-12-301."><p className="text-sm">This project holds an imported CDM Console study. Open a GLV-12-301 project to build the trial design domains.</p></Panel>
  const rows = p.design[d] ?? []
  const vars = varsOf(d, p.version)
  const upd = (fn: (r: DesignRow[]) => void, what?: string) => act((pp) => { const r = (pp.design[d] ??= []); fn(r); if (what) log(pp, `${d}: ${what}`) })
  const blank = (): DesignRow => Object.fromEntries(vars.map((v) => [v.name, v.name === 'STUDYID' ? STUDY.id : v.name === 'DOMAIN' ? d : ''])) as DesignRow
  const ta = designBuilt('TA', p.design.TA ?? [], p.version), tv = designBuilt('TV', p.design.TV ?? [], p.version)
  const built = designBuilt(d, rows, p.version)
  const findings = rows.length ? check(built, p.version, { ta, tv, set: p.ruleSet }) : []
  const sum = summarise(findings)
  const doPaste = () => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length < 2) { setMsg('Paste a header line and at least one row, separated by tabs (copied from a spreadsheet).'); return }
    const head = lines[0].split('\t').map((h) => h.trim().toUpperCase())
    const unknown = head.filter((h) => !vars.some((v) => v.name === h))
    const add = lines.slice(1).map((l) => { const c = l.split('\t'); const r = blank(); head.forEach((h, i) => { if (vars.some((v) => v.name === h)) r[h] = (c[i] ?? '').trim() }); return r })
    upd((r) => { r.push(...add) }, `pasted ${add.length} rows`)
    setMsg(`Added ${add.length} rows.${unknown.length ? ` Ignored columns that are not ${d} variables: ${unknown.join(', ')}.` : ''}`); setText(''); setPaste(false)
  }
  return (
    <div className="space-y-4">
      <Panel title="Trial design" sub="The trial design domains describe the protocol, not subjects, so you build them as tables from the protocol facts on the Study tab. Mission S8 scores them; SE is derived from DM and the design.">
        <Tabs tabs={[...TRIAL_DESIGN.map((x) => ({ id: x, label: <>{x} <span className="text-lab-text-muted">({(p.design[x] ?? []).length})</span></> })), { id: 'SE', label: 'SE (derived)' }]} value={d} onChange={(x) => { setD(x); setMsg(''); setPaste(false) }} />
        <p className="text-xs text-lab-text-muted"><b className="text-lab-text">{d} · {domainInfo(d)?.name}.</b> {d === 'SE' ? 'Subject Elements: each subject’s actual path through the elements, with start and end dates. It is derived, not built by hand: the screening element runs from consent to the first dose, the treatment element from the first to the last dose, follow-up from the last dose to the end of participation. Below is SE derived from the study’s reference DM.' : HELP[d]}</p>
        {d !== 'SE' && <div className="flex flex-wrap gap-2">
          <Btn tone="grey" onClick={() => go('study')}>Protocol facts (Study tab)</Btn>
        </div>}
      </Panel>
      {d === 'SE' ? <SeView /> : (
        <>
          <Panel title={`${d} · ${rows.length} records`} right={<div className="flex gap-1">
            <Btn tone="solid" className="py-0.5" onClick={() => upd((r) => { r.push(blank()) }, 'added a row')}>+ Add a row</Btn>
            <Btn tone="grey" className="py-0.5" onClick={() => setPaste(!paste)}>Paste from a spreadsheet</Btn>
          </div>}>
            {paste && <div className="space-y-1.5">
              <TextArea aria-label={`Rows for ${d}, tab-separated`} className="font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} placeholder={`${vars.map((v) => v.name).join('\t')}\n…`} />
              <div className="flex gap-2"><Btn tone="solid" className="py-0.5" onClick={doPaste}>Add these rows</Btn><span className="text-[11px] text-lab-text-muted self-center">First line: the variable names. STUDYID and DOMAIN are filled for you if left out.</span></div>
            </div>}
            {msg && <p className="text-xs text-lab-cdsco" role="status">{msg}</p>}
            <datalist id="ct-design">{[...new Set(vars.flatMap((v) => (v.ct ? CT[v.ct]?.terms.map((t) => t.value) ?? [] : [])))].map((t) => <option key={t} value={t} />)}</datalist>
            <Table head={[...vars.map((v) => <span title={`${v.label} · ${v.core}${v.ct ? ` · ${v.ct}` : ''}`}>{v.name}{v.core === 'Req' ? '*' : ''}</span>), '']} rows={rows.map((r, i) => [
              ...vars.map((v) => <input key={`${i}-${v.name}-${r[v.name] ?? ''}`} aria-label={`${v.name} row ${i + 1}`} list={v.ct ? 'ct-design' : undefined} className={ic(`font-mono text-[11px] py-0.5 px-1 ${['TSVAL', 'TSVAL1', 'IETEST', 'TESTRL', 'TEENRL', 'TVSTRL', 'TABRANCH'].includes(v.name) ? 'w-64' : v.name === 'STUDYID' ? 'w-24' : 'w-24'}`)} defaultValue={r[v.name] ?? ''} onBlur={(e) => { const x = e.target.value; if (x !== (r[v.name] ?? '')) upd((rr) => { rr[i][v.name] = v.name.endsWith('CD') && v.name !== 'TSVALCD' ? x.toUpperCase() : x }) }} />),
              <Btn tone="red" className="py-0.5" aria-label={`Remove row ${i + 1}`} onClick={() => upd((rr) => { rr.splice(i, 1) }, `removed row ${i + 1}`)}>✕</Btn>,
            ])} empty="No rows yet. Add rows one at a time or paste them from a spreadsheet." />
            <p className="text-[11px] text-lab-text-muted">* Required. Hover a column name for its label, core status and codelist. TSSEQ is numbered for you within each TSPARMCD when left empty.</p>
          </Panel>
          <Panel title="Checks" sub={`${p.ruleSet} rule set. TA is checked against TE and TV against TA where they exist.`}>
            <Table head={['Rule', 'Severity', 'Variable', 'Records', 'First example']} rows={sum.map((s) => [<span className="font-mono">{s.rule}</span>, <Pill tone={s.sev === 'Warning' ? 'amber' : 'red'}>{s.sev}</Pill>, <span className="font-mono">{s.variable}</span>, s.count, s.first.msg])} empty={rows.length ? 'No findings.' : 'Nothing to check yet.'} />
          </Panel>
        </>
      )}
    </div>
  )
}

function SeView() {
  const se = useMemo(() => deriveSE(), [])
  const [n, setN] = useState(30)
  return (
    <Panel title={`SE · ${se.rows.length} records`} sub="Screen failures have the screening element only. One subject was randomised but never dosed: screening, and no treatment element.">
      <Table head={se.vars} rows={se.rows.slice(0, n).map((r) => se.vars.map((v) => <span className="font-mono whitespace-nowrap">{r[v]}</span>))} />
      {se.rows.length > n && <Btn tone="grey" onClick={() => setN(n + 60)}>Show 60 more</Btn>}
    </Panel>
  )
}
