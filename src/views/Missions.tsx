import { useState } from 'react'
import { useStore } from '../state'
import { useNav } from '../App'
import { MISSIONS, activeRun, bestRun, startMission, finishMission, evaluateMission } from '../domain/missions'
import { emptySpec } from '../domain/project'
import { VERSION_LABEL } from '../domain/standards'
import { Panel, Pill, Btn, Table, Stat } from './ui'

export default function Missions() {
  const { p } = useStore()
  if (p.imported) return <Panel title="Missions" sub="Missions run on GLV-12-301."><p className="text-sm">This project holds an imported CDM Console study, which has no reference mapping. Start or open a GLV-12-301 project on the Project tab to run the missions.</p></Panel>
  const passed = MISSIONS.filter((m) => bestRun(p, m.id)?.passed).length
  return (
    <div className="space-y-4">
      <Panel title="Missions" sub="Each mission scores one of your datasets against the study’s hidden reference mapping, variable by variable, and runs the conformance checks. Phase 1 has two; AE, CM, LB, EX, DS, the trial design domains, a broken dataset and a messy lab transfer follow in Phase 2.">
        <div className="grid grid-cols-3 gap-2 max-w-md"><Stat label="Passed" value={passed} tone="green" /><Stat label="Missions" value={MISSIONS.length} tone="blue" /><Stat label="Standard" value={p.version === '3.4' ? 'v3.4' : 'v4.0 draft'} /></div>
        <p className="text-xs text-lab-text-muted">Scoring: for each variable in the reference, the share of records where your value matches; averaged; minus 3 points for each kind of conformance error left. A domain passes at 70% with no blocking error. Records are matched to the raw row they came from, so one wrong variable costs credit on that variable only.</p>
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
  return (
    <Panel title={`${m.id} · ${m.title}`} sub={`Domain ${m.domain} · Pass: ${m.pass}`} right={run ? <Pill tone="blue">In progress</Pill> : best ? <Pill tone={best.passed ? 'green' : 'red'}>best {best.score}%</Pill> : null}>
      <p className="text-sm">{m.brief}</p>
      <details className="text-xs"><summary className="cursor-pointer text-lab-text-muted">What to watch for</summary><ul className="list-disc pl-5 mt-1">{m.watch.map((w) => <li key={w}>{w}</li>)}</ul></details>
      <div className="flex flex-wrap gap-2">
        {!run && <Btn tone="solid" onClick={() => act((pp) => { startMission(pp, id); pp.specs[m.domain] ??= emptySpec(m.domain, m.domain) })}>Start</Btn>}
        <Btn onClick={() => go('mapping', m.domain)}>Open {m.domain} in the workspace</Btn>
        <Btn tone="grey" onClick={() => go('study')}>Study conventions</Btn>
        {run && <>
          <Btn tone="green" onClick={() => { try { const r = evaluateMission(p, id); setCheck({ score: r.score, detail: r.detail }) } catch (e) { setCheck({ score: 0, detail: [(e as Error).message] }) } }}>Check my progress</Btn>
          <Btn tone="solid" onClick={() => act((pp) => { finishMission(pp, id); setCheck(null) })}>Finish and score</Btn>
        </>}
      </div>
      {run && <p className="text-[11px] text-lab-text-muted">Started {run.startedUtc.slice(0, 16).replace('T', ' ')} UTC against {VERSION_LABEL[run.version]}. Checking progress shows the score without the per-variable answers.</p>}
      {check && <div className="rounded border border-lab-cdsco/40 p-2 text-xs"><p>If you finished now: <b>{check.score}%</b></p><ul className="list-disc pl-5 text-lab-text-muted">{check.detail.map((d) => <li key={d}>{d}</li>)}</ul></div>}
      {last && !run && (
        <div className={`rounded border p-3 space-y-2 ${last.passed ? 'border-lab-cdsco/60' : 'border-lab-red/60'}`}>
          <p className="font-mono text-sm">{last.passed ? 'Passed' : 'Not passed'} · {last.score}% · {m.domain} {last.domainPass?.[m.domain] ? 'pass' : 'fail'}</p>
          <ul className="list-disc pl-5 text-xs text-lab-text-muted">{last.detail?.map((d) => <li key={d}>{d}</li>)}</ul>
          <Table head={['Variable', 'Core', 'Credit', 'Where it differs']} rows={(last.perVar ?? []).map((x) => [<span className="font-mono">{x.v}</span>, x.core, <span className={x.credit >= 0.999 ? 'text-lab-cdsco' : x.credit >= 0.7 ? 'text-lab-amber' : 'text-lab-red'}>{Math.round(x.credit * 100)}%</span>, <span className="text-[11px]">{x.examples.join(' · ')}</span>])} />
        </div>
      )}
    </Panel>
  )
}
