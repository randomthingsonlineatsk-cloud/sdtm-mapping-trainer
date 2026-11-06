import { useState } from 'react'
import { useStore } from '../state'
import { useNav } from '../App'
import { TOPICS } from '../domain/learn'
import { DOMAINS, varsOf, domainInfo, DETAIL_DOMAINS, DRAFT_CHANGES, VERSION_LABEL, type Cls } from '../domain/standards'
import { log } from '../domain/project'
import { Panel, Pill, Btn, Table, Tabs } from './ui'

type T = 'map' | 'topics' | 'reference'
export default function Learn() {
  const nav = useNav()
  const [t, setT] = useState<T>(nav.arg ? 'reference' : 'map')
  return (
    <div className="space-y-4">
      <Panel title="Learn SDTM" sub="The structure of SDTM, short lessons with examples from GLV-12-301 and quizzes, and a reference for every domain. Then map the data yourself on the Mapping tab and test yourself in the Missions.">
        <Tabs tabs={[{ id: 'map', label: 'Structure map' }, { id: 'topics', label: `Lessons (${TOPICS.length})` }, { id: 'reference', label: 'Domain reference' }]} value={t} onChange={setT} />
      </Panel>
      {t === 'map' && <StructureMap />}
      {t === 'topics' && <Topics />}
      {t === 'reference' && <Reference />}
    </div>
  )
}

const CLS_ORDER: { cls: Cls; what: string }[] = [
  { cls: 'Special-Purpose', what: 'Subject-level: who, when they took part, what visits they had' },
  { cls: 'Interventions', what: 'What was given to the subject' },
  { cls: 'Events', what: 'What happened to the subject' },
  { cls: 'Findings', what: 'Results of planned evaluations, one test per record' },
  { cls: 'Findings About', what: 'Findings about an event or intervention' },
  { cls: 'Trial Design', what: 'The protocol as planned, not subject data' },
  { cls: 'Relationship', what: 'Links between records and extra qualifiers' },
  { cls: 'Study Reference', what: 'Reference data used across the study' },
]
function StructureMap() {
  const { go } = useNav()
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {CLS_ORDER.map(({ cls, what }) => (
        <Panel key={cls} title={cls} sub={what}>
          <div className="flex flex-wrap gap-1">
            {DOMAINS.filter((d) => d.cls === cls).map((d) => (
              <button key={d.code} title={d.name} onClick={() => go('learn', d.code)} className={`rounded border px-1.5 py-0.5 font-mono text-[11px] ${DETAIL_DOMAINS.includes(d.code) ? 'border-lab-fda/60 text-lab-fda' : 'border-lab-line text-lab-text-muted'}`}>{d.code}</button>
            ))}
          </div>
          <p className="text-[11px] text-lab-text-muted">{DOMAINS.filter((d) => d.cls === cls).map((d) => `${d.code} ${d.name}`).join(' · ')}</p>
        </Panel>
      ))}
      <p className="text-[11px] text-lab-text-muted md:col-span-2">Highlighted domains are mapped in this trainer and have full variable metadata under Domain reference. Domain list as in SDTMIG v3.4.</p>
    </div>
  )
}

function Topics() {
  const { p, act } = useStore()
  const [id, setId] = useState(TOPICS[0].id)
  const t = TOPICS.find((x) => x.id === id)!
  const ans = p.quiz[id] ?? {}
  const done = (tid: string) => { const a = p.quiz[tid] ?? {}; const tt = TOPICS.find((x) => x.id === tid)!; return tt.quiz.every((q, i) => a[i] === q.answer) }
  return (
    <div className="grid lg:grid-cols-[240px_1fr] gap-4">
      <Panel title="Lessons">
        <ol className="space-y-1 text-sm list-decimal pl-5">
          {TOPICS.map((x) => <li key={x.id}><button className={`text-left ${x.id === id ? 'text-lab-fda' : 'hover:text-lab-fda'}`} onClick={() => setId(x.id)}>{x.title}</button>{done(x.id) && <span className="ml-1 text-lab-cdsco" aria-label="quiz passed">✓</span>}</li>)}
        </ol>
        <p className="text-[11px] text-lab-text-muted">{TOPICS.filter((x) => done(x.id)).length} of {TOPICS.length} quizzes answered correctly.</p>
      </Panel>
      <div className="space-y-4">
        <Panel title={t.title}>
          <div className="space-y-2 text-sm leading-relaxed max-w-3xl">{t.body.map((b, i) => <p key={i}>{b}</p>)}</div>
          {t.example && <figure className="space-y-1"><Table head={t.example.head} rows={t.example.rows.map((r) => r.map((c) => <span className="font-mono">{c}</span>))} /><figcaption className="text-[11px] text-lab-text-muted">{t.example.caption}</figcaption></figure>}
        </Panel>
        <Panel title="Quiz" sub="Answers are saved with your project.">
          {t.quiz.map((q, i) => {
            const a = ans[i]
            return (
              <fieldset key={i} className="space-y-1">
                <legend className="text-sm">{i + 1}. {q.q}</legend>
                <div className="flex flex-wrap gap-1">
                  {q.options.map((o, j) => <Btn key={j} tone={a === j ? (j === q.answer ? 'green' : 'red') : 'grey'} className="py-1" aria-pressed={a === j} onClick={() => act((pp) => { pp.quiz[id] = { ...(pp.quiz[id] ?? {}), [i]: j }; if (j === q.answer) log(pp, `Quiz ${t.title}: question ${i + 1} correct`) })}>{o}</Btn>)}
                </div>
                {a !== undefined && <p className={`text-xs ${a === q.answer ? 'text-lab-cdsco' : 'text-lab-red'}`}>{a === q.answer ? 'Correct. ' : 'Not quite. '}{a === q.answer ? q.why : 'Try another answer.'}</p>}
              </fieldset>
            )
          })}
        </Panel>
      </div>
    </div>
  )
}

function Reference() {
  const { p } = useStore()
  const nav = useNav()
  const [code, setCode] = useState(nav.arg && domainInfo(nav.arg) ? nav.arg : 'DM')
  const d = domainInfo(code)!
  const vars = varsOf(code, p.version)
  return (
    <div className="space-y-4">
      <Panel title={`${d.code} · ${d.name}`} sub={`${d.cls}${d.structure ? ` · ${d.structure}` : ''} · ${VERSION_LABEL[p.version]}`} right={<select aria-label="Domain" className="rounded border border-lab-line bg-lab-panel-strong px-2 py-1 text-xs" value={code} onChange={(e) => setCode(e.target.value)}>{DOMAINS.map((x) => <option key={x.code} value={x.code}>{x.code} · {x.name}</option>)}</select>}>
        {vars.length ? (
          <Table head={['Variable', 'Label', 'Type', 'Role', 'Core', 'Codelist', '']} rows={vars.map((v) => [<span className="font-mono">{v.name}</span>, v.label, v.type, v.role, <Pill tone={v.core === 'Req' ? 'red' : v.core === 'Exp' ? 'amber' : 'grey'}>{v.core}</Pill>, v.ct ?? '', v.draft ? <Pill tone="purple">v4.0 draft</Pill> : ''])} />
        ) : <p className="text-sm text-lab-text-muted">Variable metadata for {d.code} is not bundled in Phase 1; the trainer details the domains it maps (DM, SV, VS, EX, AE, CM, DS). See the SDTMIG for the rest.</p>}
        {vars.length > 0 && code !== 'DM' && code !== 'SV' && <p className="text-[11px] text-lab-text-muted">Shown: the variables this study can use, in IG order. Some rarely used permissible variables are left out.</p>}
      </Panel>
      {p.version === '4.0d' && <Panel title="SDTMIG v4.0 draft changes in this mode"><ul className="list-disc pl-5 text-sm">{DRAFT_CHANGES.map((c) => <li key={c.what}>{c.what} <span className="text-lab-text-muted">({c.where})</span></li>)}</ul></Panel>}
    </div>
  )
}
