import { useMemo, useState } from 'react'
import { useStore } from '../state'
import { useNav } from '../App'
import { RULE_SETS, type RuleSet } from '../domain/conformance'
import { allDatasets } from '../domain/datasets'
import { packageFindings, toIssues, statusOf, canExplain, explanationOf, runSummary, sinceRun, reportCsv, detailsCsv, type Issue } from '../domain/validation'
import { log } from '../domain/project'
import { download } from '../domain/store'
import { Panel, Pill, Btn, Table, Stat, TextArea, fmtUtc } from './ui'
import { RuleHelp } from './RuleHelp'
import { useData } from './shared'

const SEV_TONE = { Reject: 'purple', Error: 'red', Warning: 'amber' } as const
const ST_TONE = { 'Must fix': 'red', Explained: 'green', Open: 'amber' } as const

export function useIssues() {
  const { p, tick } = useStore()
  const data = useData()
  return useMemo(() => { const all = allDatasets(p, data); return { all, issues: toIssues(packageFindings(p, data, all)) } }, [data, tick])
}

export default function Validation() {
  const { p, act } = useStore()
  const { go } = useNav()
  const { all, issues } = useIssues()
  const [open, setOpen] = useState<string | null>(null)
  const [help, setHelp] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'Open' | 'Must fix' | 'Explained'>('all')
  const runs = p.validation ?? []
  const last = runs[runs.length - 1]
  const prev = runs[runs.length - 2]
  const diff = sinceRun(prev, last ? toIssuesKeys(last.keys) : [])
  const count = (s: string) => issues.filter((i) => statusOf(i, p) === s).length
  const shown = issues.filter((i) => filter === 'all' || statusOf(i, p) === filter)
  const run = () => act((pp) => {
    const r = runSummary(pp, issues); (pp.validation ??= []).push(r); if (pp.validation.length > 20) pp.validation.splice(0, pp.validation.length - 20)
    log(pp, `Validation run (${pp.ruleSet}): ${r.reject} Reject, ${r.error} Error, ${r.warning} Warning`)
  })
  const setRules = (r: RuleSet) => act((pp) => { pp.ruleSet = r; log(pp, `Rule set: ${r}`) })
  if (!all.size) return <Panel title="Validation" sub="Nothing to validate yet."><p className="text-sm">Map a domain first.</p></Panel>
  return (
    <div className="space-y-4">
      <Panel title="Validation" sub="One run over the whole package: every dataset, RELREC, the trial design and define.xml, under the rule set of the submission. Each issue is fixed in the mapping, or, when the data really are so, explained: the explanation goes into section 4.2 of the reviewer’s guide. Reject findings and findings that mean the mapping is wrong cannot be explained."
        right={<div className="flex flex-wrap gap-1"><Btn tone="solid" onClick={run}>Run validation</Btn>{last && <><Btn tone="grey" onClick={() => download(`${p.study}_validation_report.csv`, reportCsv(p, issues, last), 'text/csv')}>Run report (CSV)</Btn><Btn tone="grey" onClick={() => download(`${p.study}_validation_details.csv`, detailsCsv(issues), 'text/csv')}>Details (CSV)</Btn></>}</div>}>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Rule set">
          <span className="text-xs text-lab-text-muted">Rule set</span>
          {RULE_SETS.map((r) => <Btn key={r.id} tone={p.ruleSet === r.id ? 'solid' : 'grey'} className="py-0.5" aria-pressed={p.ruleSet === r.id} onClick={() => setRules(r.id)}>{r.name}</Btn>)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Stat label="Datasets" value={all.size} tone="blue" />
          <Stat label="Issues" value={issues.length} />
          <Stat label="Must fix" value={count('Must fix')} tone={count('Must fix') ? 'red' : 'green'} />
          <Stat label="Not explained" value={count('Open')} tone={count('Open') ? 'amber' : 'green'} />
          <Stat label="Explained" value={count('Explained')} tone="green" />
        </div>
        <p className="text-xs text-lab-text-muted" role="status">{last ? <>Last run {fmtUtc(last.utc)} UTC under {last.ruleSet} on transfer {last.transfer}: {last.reject} Reject, {last.error} Error, {last.warning} Warning findings.{prev && <> Since the run before: {diff.fixed.length} issue{diff.fixed.length === 1 ? '' : 's'} fixed, {diff.added.length} new.</>}{last.ruleSet !== p.ruleSet && <span className="text-lab-amber"> The project now uses {p.ruleSet}: run again.</span>}</> : 'No run yet. The table below is live; Run validation records a run for the report and the reviewer’s guide.'}</p>
      </Panel>
      {help && <RuleHelp id={help} onClose={() => setHelp(null)} />}
      <Panel title="Issues" right={<div className="flex gap-1" role="group" aria-label="Show">{(['all', 'Open', 'Must fix', 'Explained'] as const).map((f) => <Btn key={f} tone={filter === f ? 'solid' : 'grey'} className="py-0.5" aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : f === 'Open' ? 'Not explained' : f}</Btn>)}</div>}>
        <Table head={['Check', 'Severity', 'Dataset', 'Variable', 'Records', 'Subjects', 'Message', 'Status', '']} rows={shown.map((i) => {
          const st = statusOf(i, p)
          return [
            i.rule.startsWith('TRN') ? <button className="font-mono underline" onClick={() => setHelp(i.rule)}>{i.rule}</button> : <span className="font-mono">{i.rule}</span>,
            <Pill tone={SEV_TONE[i.sev]}>{i.sev}</Pill>, <span className="font-mono">{i.dataset}</span>, <span className="font-mono">{i.variable}</span>, i.count, i.subjects || '', <span className="text-[11px]">{i.message}</span>,
            <Pill tone={ST_TONE[st]}>{st === 'Open' ? 'Not explained' : st}</Pill>,
            <div className="flex gap-1">
              {canExplain(i) && <Btn tone="grey" className="py-0.5" aria-expanded={open === i.key} onClick={() => setOpen(open === i.key ? null : i.key)}>{st === 'Explained' ? 'Edit' : 'Explain'}</Btn>}
              {i.dataset === 'define.xml' ? <Btn tone="grey" className="py-0.5" onClick={() => go('define')}>Open</Btn> : <Btn tone="grey" className="py-0.5" onClick={() => go('datasets', i.dataset)}>Open</Btn>}
            </div>,
          ]
        })} empty={issues.length ? 'None in this view.' : 'No findings: the package is clean under this rule set.'} />
        {open && issues.find((i) => i.key === open) && <ExplainBox issue={issues.find((i) => i.key === open)!} onDone={() => setOpen(null)} />}
      </Panel>
      <Panel title="Run history" sub="Kept with the project (the last 20 runs).">
        <Table head={['Run (UTC)', 'Rule set', 'Transfer', 'SDTMIG', 'Reject', 'Error', 'Warning', 'Issues']} rows={[...runs].reverse().map((r) => [fmtUtc(r.utc), r.ruleSet, r.transfer, r.version === '3.4' ? '3.4' : '4.0 draft', r.reject, r.error, r.warning, r.keys.length])} empty="No runs yet." />
      </Panel>
    </div>
  )
}
const toIssuesKeys = (keys: string[]) => keys.map((key) => ({ key }) as Issue)

function ExplainBox({ issue, onDone }: { issue: Issue; onDone: () => void }) {
  const { p, act } = useStore()
  const cur = p.explain?.[issue.key]
  const [text, setText] = useState(cur?.text ?? '')
  const ex = issue.findings.slice(0, 5)
  const save = (t: string) => act((pp) => {
    if (t.trim()) (pp.explain ??= {})[issue.key] = { text: t.trim(), by: pp.userId, utc: new Date().toISOString() }
    else if (pp.explain) delete pp.explain[issue.key]
    log(pp, `${t.trim() ? 'Explained' : 'Removed the explanation of'} ${issue.rule} ${issue.variable} in ${issue.dataset}`)
  })
  return (
    <div role="region" aria-label={`Explain ${issue.rule}`} className="mt-2 rounded border border-lab-line p-3 space-y-2 text-xs">
      <p className="text-sm"><b className="font-mono">{issue.rule}</b> {issue.check} · <span className="font-mono">{issue.dataset}.{issue.variable}</span> · {issue.count} record{issue.count === 1 ? '' : 's'}</p>
      <ul className="list-disc pl-5 text-lab-text-muted">{ex.map((f, i) => <li key={i}>{f.usubjid ? <span className="font-mono">{f.usubjid}: </span> : null}{f.msg}</li>)}{issue.findings.length > ex.length && <li>and {issue.findings.length - ex.length} more</li>}</ul>
      <p className="text-lab-text-muted">Explain only what is true of the data: what the records show, why (for example the site confirmed the values in a query and the source agrees), and that the data were left as collected. A finding the mapping causes is fixed, not explained. Check the raw data and the comments (CO) before writing.</p>
      <TextArea aria-label="Explanation" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. The end date is before the start date for one adverse event. The site confirmed both dates against the source document in a query; the correct date cannot be established, so the data are submitted as collected." />
      <div className="flex items-center gap-2">
        <Btn tone="solid" disabled={text.trim().length < 20} onClick={() => { save(text); onDone() }}>Save explanation</Btn>
        {cur && <Btn tone="grey" onClick={() => { save(''); onDone() }}>Remove</Btn>}
        <Btn tone="grey" onClick={onDone}>Cancel</Btn>
        {text.trim().length > 0 && text.trim().length < 20 && <span className="text-lab-amber">At least 20 characters.</span>}
        {explanationOf(p, issue.key) && <span className="text-lab-text-muted">Saved by {cur!.by}, {fmtUtc(cur!.utc)} UTC</span>}
      </div>
    </div>
  )
}
