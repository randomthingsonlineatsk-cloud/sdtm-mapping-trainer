import { useState } from 'react'
import { useStore } from '../state'
import { useNav } from '../App'
import { MISSIONS, activeRun, bestRun, startMission, finishMission, evaluateMission } from '../domain/missions'
import { emptySpec } from '../domain/project'
import { DEFAULT_SOURCE } from '../domain/reference'
import { VERSION_LABEL, isRel, dsName } from '../domain/standards'
import { Panel, Pill, Btn, Table, Stat } from './ui'


export default function Missions() {
  const { p } = useStore()
  if (p.imported) return <Panel title="Missions" sub="Missions run on GLV-12-301."><p className="text-sm">This project holds an imported CDM Console study, which has no reference mapping. Start or open a GLV-12-301 project on the Project tab to run the missions.</p></Panel>
  const passed = MISSIONS.filter((m) => bestRun(p, m.id)?.passed).length
  return (
    <div className="space-y-4">
      <Panel title="Missions" sub="Each mission scores your datasets against the study’s hidden reference mapping, variable by variable, and runs the conformance checks under your project’s rule set.">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-xl"><Stat label="Passed" value={passed} tone="green" /><Stat label="Missions" value={MISSIONS.length} tone="blue" /><Stat label="Standard" value={p.version === '3.4' ? 'v3.4' : 'v4.0 draft'} /><Stat label="Rule set" value={p.ruleSet} /></div>
        <p className="text-xs text-lab-text-muted">Scoring, per domain: for each variable in the reference, the share of records where your value matches, averaged, minus 3 points for each kind of Error or Reject finding left (at most 30). A domain passes at 70% with no blocking finding (a missing Required variable, a wrong DOMAIN, a duplicate subject or --SEQ, an empty Required value, or anything the rule set rejects). A mission passes when all its domains pass, and its score is their mean. Records are matched to the raw row they came from (trial design tables by their key), so one wrong variable costs credit on that variable only.</p>
      </Panel>
      {MISSIONS.map((m) => <MissionCard key={m.id} id={m.id} />)}
    </div>
  )
}

function MissionCard({ id }: { id: string }) {
  const { p, act } = useStore()
  const { go } = useNav()
  const m = MISSIONS.find((x) => x.id === id)!
  const run = activeRun(p, id)
  const best = bestRun(p, id)
  const last = [...p.missions].reverse().find((x) => x.id === id && x.score !== undefined)
  const [check, setCheck] = useState<{ score: number; detail: string[] } | null>(null)
  const [confirm, setConfirm] = useState(false)
  const start = () => act((pp) => {
    startMission(pp, id)
    if (m.kind === 'map') for (const d of m.domains) if (!isRel(d)) pp.specs[d] ??= emptySpec(d, DEFAULT_SOURCE[d] ?? d)
  })
  const open = m.kind === 'design' ? <Btn onClick={() => go('design')}>Open the Trial design tab</Btn>
    : m.kind === 'relrec' ? <Btn onClick={() => go('relations')}>Open Relationships</Btn>
    : m.kind === 'custom' ? <><Btn onClick={() => go('raw')}>The EDU form</Btn><Btn onClick={() => go('mapping', m.domains[0])}>Define and map {m.domains[0]}</Btn></>
    : m.kind === 'spec' ? <><Btn onClick={() => go('plan')}>Write the specification</Btn><Btn onClick={() => go('mapping', m.domains[0])}>Program {m.domains[0]}</Btn></>
    : m.kind === 'rerun' ? <><Btn onClick={() => go('raw')}>What changed (Raw data)</Btn>{m.domains.map((d) => <Btn key={d} onClick={() => go('mapping', d)}>Open {d}</Btn>)}</>
    : m.kind === 'qc' ? <><Btn onClick={() => go('mapping', `qc:${m.domains[0]}`)}>Write your QC {m.domains[0]}</Btn><Btn onClick={() => go('qc')}>Open QC compare</Btn></>
    : m.domains.filter((d) => !isRel(d)).map((d) => <Btn key={d} onClick={() => go('mapping', d)}>Open {d} in the workspace</Btn>)
  return (
    <Panel title={`${m.id} · ${m.title}`} sub={<>Domain{m.domains.length > 1 ? 's' : ''} {m.domains.map((d) => dsName(d, p.version)).join(', ')} · {m.kind === 'fix' ? 'Fix a delivery' : m.kind === 'design' ? 'Trial design' : m.kind === 'qc' ? 'Independent QC' : m.kind === 'rerun' ? 'New data transfer' : m.kind === 'spec' ? 'Specification first' : m.kind === 'relrec' ? 'Relationships' : m.kind === 'custom' ? 'Custom domain' : 'Map from raw'} · Pass: {m.pass}</>}
      right={run ? <Pill tone="blue">In progress</Pill> : best ? <Pill tone={best.passed ? 'green' : 'red'}>best {best.score}%</Pill> : null}>
      <p className="text-sm">{m.brief}</p>
      <details className="text-xs"><summary className="cursor-pointer text-lab-text-muted">What to watch for</summary><ul className="list-disc pl-5 mt-1">{m.watch.map((w) => <li key={w}>{w}</li>)}</ul></details>
      <div className="flex flex-wrap gap-2">
        {!run && !['fix', 'qc', 'spec'].includes(m.kind) && <Btn tone="solid" onClick={start}>Start</Btn>}
        {!run && ['fix', 'qc', 'spec'].includes(m.kind) && !confirm && <Btn tone="solid" onClick={() => setConfirm(true)}>Start…</Btn>}
        {open}
        <Btn tone="grey" onClick={() => go('study')}>Study conventions</Btn>
        {run && <>
          <Btn tone="green" onClick={() => { try { const r = evaluateMission(p, id); setCheck({ score: r.score, detail: r.detail }) } catch (e) { setCheck({ score: 0, detail: [(e as Error).message] }) } }}>Check my progress</Btn>
          <Btn tone="solid" onClick={() => act((pp) => { finishMission(pp, id); setCheck(null) })}>Finish and score</Btn>
        </>}
      </div>
      {confirm && !run && (
        <div role="alertdialog" aria-label="Replace your mappings?" className="rounded border border-lab-amber/60 bg-lab-amber-soft p-3 text-sm space-y-2">
          <p>{m.kind === 'spec' ? `Starting ${m.id} clears your ${m.domains[0]} specification and program.` : m.kind === 'qc' ? `Starting ${m.id} replaces your production ${m.domains[0]} with the colleague’s and clears your QC ${m.domains[0]}, its resolutions and sign-off.` : `Starting ${m.id} replaces your AE and LB mappings with the colleague’s broken ones.`} Your current rules will be lost unless you export the project first (Project tab).</p>
          <div className="flex gap-2"><Btn tone="solid" onClick={() => { start(); setConfirm(false) }}>Replace and start</Btn><Btn tone="grey" onClick={() => go('project')}>Export first</Btn><Btn tone="grey" onClick={() => setConfirm(false)}>Cancel</Btn></div>
        </div>
      )}
      {run && <p className="text-[11px] text-lab-text-muted">Started {run.startedUtc.slice(0, 16).replace('T', ' ')} UTC against {VERSION_LABEL[run.version]} with the {run.ruleSet ?? 'CDISC'} rule set. Checking progress shows the score without the per-variable answers.</p>}
      {check && <div className="rounded border border-lab-cdsco/40 p-2 text-xs"><p>If you finished now: <b>{check.score}%</b></p><ul className="list-disc pl-5 text-lab-text-muted">{check.detail.map((d) => <li key={d}>{d}</li>)}</ul></div>}
      {last && !run && (
        <div className={`rounded border p-3 space-y-2 ${last.passed ? 'border-lab-cdsco/60' : 'border-lab-red/60'}`}>
          <p className="font-mono text-sm">{last.passed ? 'Passed' : 'Not passed'} · {last.score}% · {last.ruleSet ?? 'CDISC'} rules</p>
          <div className="flex flex-wrap gap-1">{(last.domainScores ? Object.keys(last.domainScores) : m.domains.map((d) => dsName(d, last.version))).map((d) => <Pill key={d} tone={last.domainPass?.[d] ? 'green' : 'red'}>{d} {last.domainScores?.[d] ?? '–'}% {last.domainPass?.[d] ? 'pass' : 'fail'}</Pill>)}</div>
          <ul className="list-disc pl-5 text-xs text-lab-text-muted">{last.detail?.map((d) => <li key={d}>{d}</li>)}</ul>
          <Table head={['Variable', 'Core', 'Credit', 'Where it differs']} rows={(last.perVar ?? []).map((x) => [<span className="font-mono">{x.v}</span>, x.core, <span className={x.credit >= 0.999 ? 'text-lab-cdsco' : x.credit >= 0.7 ? 'text-lab-amber' : 'text-lab-red'}>{Math.round(x.credit * 100)}%</span>, <span className="text-[11px]">{x.examples.join(' · ')}</span>])} />
        </div>
      )}
    </Panel>
  )
}
