import { useMemo, useState } from 'react'
import { useStore } from '../state'
import { crfPages, suggest, checkAcrf, domainsOf, namedVars, DOMAIN_COLOURS, NOT_SUBMITTED } from '../domain/acrf'
import { domainInfo } from '../domain/standards'
import { log, isGlv } from '../domain/project'
import { raw } from '../domain/seed'
import { STUDY } from '../domain/study'
import { Panel, Pill, Btn, Table, ic } from './ui'

function saveBytes(name: string, bytes: Uint8Array) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }))
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function Acrf() {
  const { p, act } = useStore()
  const pages = useMemo(() => crfPages(raw(p.transfer ?? 1).forms), [p.transfer])
  const [form, setForm] = useState(pages[0]?.form ?? '')
  const [busy, setBusy] = useState(false)
  if (!isGlv(p)) return <Panel title="Annotated CRF" sub="The aCRF is built for GLV-12-301."><p className="text-sm">This project works on another study; open a GLV-12-301 project to annotate its CRF.</p></Panel>
  const notes = p.acrf ?? {}
  const relrec = p.relrec ?? []
  const findings = checkAcrf(pages, notes, p.specs, relrec, p.version)
  const pg = pages.find((x) => x.form === form)!
  const doms = domainsOf(form, p.specs)
  const set = (field: string, text: string) => act((pp) => { ((pp.acrf ??= {})[form] ??= {})[field] = text })
  const fill = (only: 'empty' | 'all') => act((pp) => {
    const s = suggest(form, pp.specs, pp.relrec ?? [], pp.version), cur = ((pp.acrf ??= {})[form] ??= {})
    for (const [k, v] of Object.entries(s)) if (only === 'all' || !cur[k]) cur[k] = v
    log(pp, `aCRF ${form}: annotations ${only === 'all' ? 'replaced' : 'filled'} from the mapping`)
  })
  const colour = (a: string) => {
    if (!a) return 'transparent'
    if (a === NOT_SUBMITTED) return '#E5E7EB'
    const nv = namedVars(a, doms)[0]
    return DOMAIN_COLOURS[Math.max(0, doms.indexOf(nv?.domain ?? '')) % DOMAIN_COLOURS.length]
  }
  const byForm = (f: string) => findings.filter((x) => x.form === f)
  return (
    <div className="space-y-4">
      <Panel title="Annotated CRF" sub="Each unique CRF page is annotated once with the SDTM variables its fields are submitted in: the domain header at the top left; the variable alone when a page feeds one domain, DOMAIN.VARIABLE when it feeds several; findings as “VSORRES when VSTESTCD = SYSBP”; supplemental qualifiers as “QVAL when QNAM = RACE1 in SUPPDM”; link fields as RELREC; fields collected but not submitted as [NOT SUBMITTED]. Derived variables (standard results, study days, AGE) are not annotated."
        right={<Btn tone="solid" disabled={busy} onClick={async () => { setBusy(true); try { const { acrfPdf } = await import('../domain/acrfPdf'); saveBytes('acrf.pdf', acrfPdf(STUDY.id, pages, notes, p.specs)) } finally { setBusy(false) } }}>{busy ? 'Writing…' : 'Download acrf.pdf'}</Btn>}>
        <div className="flex flex-wrap gap-1" role="group" aria-label="CRF pages">
          {pages.map((x) => { const n = byForm(x.form).filter((f) => f.sev === 'Error').length; return <Btn key={x.form} tone={x.form === form ? 'solid' : 'grey'} className="py-0.5" aria-pressed={x.form === form} onClick={() => setForm(x.form)}>{x.form} {n ? <span className="text-lab-red">· {n}</span> : <span className="text-lab-cdsco">✓</span>}</Btn> })}
        </div>
        <p className="text-xs text-lab-text-muted">{findings.filter((f) => f.sev === 'Error').length} errors and {findings.filter((f) => f.sev === 'Warning').length} warnings across {pages.length} pages. acrf.pdf has a linked table of contents and bookmarks by form and by visit.</p>
      </Panel>
      <Panel title={`${pg.title} · ${pg.form}`} sub={`Visits: ${pg.visits.join(', ')}`}
        right={<div className="flex gap-1"><Btn tone="grey" className="py-0.5" onClick={() => fill('empty')}>Fill empty from my mapping</Btn><Btn tone="grey" className="py-0.5" onClick={() => fill('all')}>Replace all from my mapping</Btn></div>}>
        <div className="flex flex-wrap gap-1" aria-label="Domain header">
          {doms.length ? doms.map((d, i) => <span key={d} className="rounded px-2 py-0.5 text-xs font-semibold text-slate-900" style={{ background: DOMAIN_COLOURS[i % DOMAIN_COLOURS.length] }}>{d} ({domainInfo(d)?.name})</span>) : <span className="text-xs text-lab-amber">No domain is mapped from this form yet.</span>}
        </div>
        <div className="divide-y divide-lab-line rounded border border-lab-line">
          {pg.fields.map((f) => {
            const a = notes[form]?.[f.name] ?? ''
            const fs = byForm(form).filter((x) => x.field === f.name)
            return (
              <div key={f.name} className="grid md:grid-cols-[1fr_1fr_1.3fr] gap-2 p-2 items-start">
                <div><p className="text-sm">{f.label}</p><p className="font-mono text-[11px] text-lab-text-muted">{f.name}</p></div>
                <div className="text-xs">{f.date ? <span className="inline-block rounded border border-lab-line px-2 py-1 text-lab-text-muted">DD-MMM-YYYY</span> : f.options.length ? <span className="flex flex-wrap gap-x-3">{f.options.map((o) => <span key={o}>◯ {o}</span>)}</span> : <span className="inline-block w-40 rounded border border-lab-line px-2 py-1">&nbsp;</span>}</div>
                <div className="space-y-1">
                  <input key={`${form}-${f.name}-${a}`} aria-label={`Annotation for ${f.name}`} className={ic('w-full font-mono text-[11px] py-1 text-slate-900')} style={{ background: colour(a) }} defaultValue={a} onBlur={(e) => e.target.value !== a && set(f.name, e.target.value.trim())} placeholder="e.g. VSORRES when VSTESTCD = SYSBP" />
                  {fs.map((x) => <p key={x.msg} className={`text-[11px] ${x.sev === 'Error' ? 'text-lab-red' : 'text-lab-amber'}`}>{x.msg}</p>)}
                </div>
              </div>
            )
          })}
        </div>
      </Panel>
      <Panel title="aCRF checks" sub="Every field annotated or marked not submitted; every variable a real variable of its domain; every annotation matching where the mapping puts the field.">
        <Table head={['Page', 'Field', 'Severity', 'Finding']} rows={findings.slice(0, 60).map((x) => [<button className="font-mono underline" onClick={() => setForm(x.form)}>{x.form}</button>, <span className="font-mono">{x.field}</span>, <Pill tone={x.sev === 'Error' ? 'red' : 'amber'}>{x.sev}</Pill>, x.msg])} empty="No findings: the aCRF matches the mapping." />
      </Panel>
    </div>
  )
}
