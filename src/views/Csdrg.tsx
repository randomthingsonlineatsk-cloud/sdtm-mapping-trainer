import { useMemo, useState } from 'react'
import { useStore } from '../state'
import { useNav } from '../App'
import { buildCsdrg, suggestNotes, needsNote, CSDRG_RULES, type CsdrgSection } from '../domain/csdrg'
import { isRel, TRIAL_DESIGN, domainInfo } from '../domain/standards'
import { log, isGlv } from '../domain/project'
import { STUDY } from '../domain/study'
import { Panel, Pill, Btn, Table, Stat, TextArea } from './ui'
import { useData } from './shared'
import { useIssues } from './Validation'

function saveBytes(name: string, bytes: Uint8Array) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }))
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function Csdrg() {
  const { p, act } = useStore()
  const { go } = useNav()
  const data = useData()
  const { all, issues } = useIssues()
  const [busy, setBusy] = useState(false)
  const last = (p.validation ?? []).at(-1)
  const g = useMemo(() => buildCsdrg(p, data, all, issues, last), [all, issues, last, p.csdrg, p.explain])
  if (!isGlv(p)) return <Panel title="Reviewer’s guide" sub="Built for GLV-12-301."><p className="text-sm">Open a GLV-12-301 project to write its reviewer’s guide.</p></Panel>
  if (!all.size) return <Panel title="Reviewer’s guide" sub="Nothing to describe yet."><p className="text-sm">Map a domain first.</p></Panel>
  const n = p.csdrg ?? {}
  const set = (f: (c: NonNullable<typeof p.csdrg>) => void, what: string) => act((pp) => { f(pp.csdrg ??= {}); log(pp, `Reviewer’s guide: ${what}`) })
  const sugg = suggestNotes(p, all)
  const doms = [...all.keys()].filter((d) => !isRel(d) && !TRIAL_DESIGN.includes(d))
  const errs = g.findings.filter((f) => f.sev === 'Error').length
  const pdf = async () => { setBusy(true); try { const { csdrgPdf } = await import('../domain/csdrgPdf'); saveBytes('csdrg.pdf', csdrgPdf(STUDY.id, g, { author: n.author ?? '', date: new Date().toISOString().slice(0, 10), title: STUDY.title })) } finally { setBusy(false) } }
  return (
    <div className="space-y-4">
      <Panel title="Clinical Study Data Reviewer’s Guide" sub="The cSDRG in the PHUSE template’s sections. The facts (standards, dictionaries, sources, design, datasets, validation inputs) come from the project; you write the purpose, notes on the source data and the design, and a note for each domain that needs one; the issues table takes the explanations you wrote on the Validation tab."
        right={<Btn tone="solid" disabled={busy} onClick={pdf}>{busy ? 'Writing…' : 'Download csdrg.pdf'}</Btn>}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Sections" value={g.sections.length} tone="blue" />
          <Stat label="Issues in 4.2" value={issues.length} />
          <Stat label="Domain notes" value={doms.filter((d) => n.domains?.[d]?.trim()).length} />
          <Stat label="Findings" value={g.findings.length} tone={errs ? 'red' : g.findings.length ? 'amber' : 'green'} />
        </div>
        <label className="block text-xs">Prepared by <input aria-label="Prepared by" className="ml-2 w-64 rounded border border-lab-line bg-lab-panel-strong px-2 py-1 text-sm" defaultValue={n.author ?? ''} onBlur={(e) => e.target.value !== (n.author ?? '') && set((c) => { c.author = e.target.value.trim() }, 'author set')} /></label>
      </Panel>
      <Panel title="Guide checks" sub="What a reviewer would miss.">
        <Table head={['Check', 'Severity', 'Where', 'Finding', 'How to fix']} rows={g.findings.map((f) => [<span className="font-mono">{f.rule}</span>, <Pill tone={f.sev === 'Error' ? 'red' : 'amber'}>{f.sev}</Pill>, f.where, f.msg, <span className="text-[11px]">{CSDRG_RULES[f.rule]}{['CSD-001', 'CSD-002', 'CSD-003', 'CSD-004'].includes(f.rule) && <> <button className="underline" onClick={() => go('validation')}>Open Validation</button></>}{f.rule === 'CSD-006' && <> <button className="underline" onClick={() => go('design')}>Open Trial design</button></>}</span>])} empty="No findings: the guide is complete." />
      </Panel>
      <Panel title="What you write">
        <Note label="1.1 Purpose (added to the standard paragraph)" value={n.purpose} onSave={(v) => set((c) => { c.purpose = v }, 'purpose edited')} />
        <Note label="1.4 Source data: anything a reviewer should know about the transfers" value={n.source} onSave={(v) => set((c) => { c.source = v }, 'source note edited')} />
        <Note label="2.2 Protocol design: amendments, design notes" value={n.design} onSave={(v) => set((c) => { c.design = v }, 'design note edited')} />
        <div className="flex items-center justify-between gap-2 pt-2"><p className="text-sm font-semibold">3.3 Domain notes</p>
          <Btn tone="grey" className="py-0.5" onClick={() => set((c) => { c.domains ??= {}; for (const [d, t] of Object.entries(sugg)) if (!c.domains[d]?.trim()) c.domains[d] = t }, 'empty domain notes filled from suggestions')}>Fill empty notes with suggestions</Btn></div>
        <p className="text-[11px] text-lab-text-muted">Write what a reviewer needs and cannot see in define.xml: how records were selected or derived, sponsor decisions, known data issues. A custom domain, and a dataset with supplemental qualifiers or non-standard variables, always needs a note.</p>
        {doms.map((d) => <Note key={d} label={`${d} · ${domainInfo(d)?.name ?? d}${needsNote(p, d) ? ' (needs a note)' : ''}`} value={n.domains?.[d]} hint={sugg[d]} onSave={(v) => set((c) => { (c.domains ??= {})[d] = v }, `note on ${d} edited`)} />)}
      </Panel>
      <Panel title="Preview" sub="As csdrg.pdf will read.">
        <div className="space-y-3 text-sm">{g.sections.map((s) => <SectionView key={s.num} s={s} />)}</div>
      </Panel>
    </div>
  )
}

function Note({ label, value, hint, onSave }: { label: string; value?: string; hint?: string; onSave: (v: string) => void }) {
  return (
    <label className="block text-xs space-y-1">
      <span>{label}</span>
      <TextArea key={value ?? ''} aria-label={label} className="min-h-14 text-xs" defaultValue={value ?? ''} placeholder={hint ? `Suggestion: ${hint}` : ''} onBlur={(e) => e.target.value.trim() !== (value ?? '').trim() && onSave(e.target.value.trim())} />
    </label>
  )
}

function SectionView({ s }: { s: CsdrgSection }) {
  const H = s.level === 1 ? 'text-base font-semibold pt-2' : s.level === 2 ? 'text-sm font-semibold' : 'text-xs font-semibold'
  return (
    <section aria-label={`${s.num} ${s.title}`}>
      <p className={H}>{s.num} {s.title}</p>
      {s.paras.map((x, i) => <p key={i} className="text-xs mt-1">{x}</p>)}
      {s.table && <Table className="mt-1" head={s.table.head} rows={s.table.rows.map((r) => r.map((c, i) => <span className={`text-[11px] ${c === 'NOT EXPLAINED' || c.startsWith('MUST BE FIXED') ? 'text-lab-red font-semibold' : ''}`} key={i}>{c}</span>))} />}
    </section>
  )
}
