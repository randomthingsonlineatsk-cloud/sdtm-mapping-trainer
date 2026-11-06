import { useStore } from '../state'
import { STUDY, SITES, ARMS, VISITS, CONVENTIONS } from '../domain/study'
import { CT_VERSION, VERSION_LABEL } from '../domain/standards'
import { raw } from '../domain/seed'
import { Panel, Table, Stat, Pill } from './ui'

export default function StudyView() {
  const { p } = useStore()
  if (p.imported) return <Imported />
  const subs = raw().subjects
  return (
    <div className="space-y-4">
      <Panel title={STUDY.title} sub={`Protocol ${STUDY.id} · ${STUDY.sponsor} · ${STUDY.phase} · ${STUDY.indication}`} right={<Pill tone="blue">Fictional</Pill>}>
        <p className="text-sm">{STUDY.design}.</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Stat label="Screened" value={subs.length} /><Stat label="Screen failures" value={subs.filter((s) => s.fate === 'screen-fail').length} tone="amber" />
          <Stat label="Randomised" value={subs.filter((s) => s.fate !== 'screen-fail').length} tone="blue" /><Stat label="Completed" value={subs.filter((s) => s.fate === 'completed').length} tone="green" /><Stat label="Sites" value={SITES.length} />
        </div>
        <p className="text-xs text-lab-text-muted">Standard: {VERSION_LABEL[p.version]}. Terminology: {CT_VERSION}.</p>
      </Panel>
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Arms" sub="Planned arms, as they will appear in TA and DM.">
          <Table head={['ARMCD', 'ARM']} rows={ARMS.map((a) => [<span className="font-mono">{a.code}</span>, a.name])} />
        </Panel>
        <Panel title="Sites" sub="SITEID is the first part of the subject number.">
          <Table head={['SITEID', 'Site', 'Country', 'Weight · height units']} rows={SITES.map((s) => [<span className="font-mono">{s.id}</span>, s.name, `${s.country} (${s.iso})`, `${s.weightUnit} · ${s.heightUnit}`])} />
        </Panel>
      </div>
      <Panel title="Schedule (trial visits)" sub="EDC folder name, the SDTM visit number and name, planned study day and window. Day 1 is the day of the first dose.">
        <Table head={['EDC folder', 'VISITNUM', 'VISIT', 'Planned day', 'Window', 'Epoch', 'Vital signs planned']} rows={VISITS.map((v) => [v.raw, v.num, <span className="font-mono">{v.name}</span>, v.day, v.lo === v.hi ? `day ${v.lo}` : `${v.lo} to ${v.hi}`, v.epoch, v.vs.join(', ')])} />
        <p className="text-[11px] text-lab-text-muted">Unscheduled visits are recorded in the EDC folder “Unscheduled” (blood pressure and pulse only).</p>
      </Panel>
      <Panel title="SDTM conventions for this study" sub="The sponsor’s rules for derivations the SDTMIG leaves to the sponsor. The reference mappings that score the missions follow them exactly.">
        <Table head={['Topic', 'Convention']} rows={CONVENTIONS.map((c) => [<span className="font-mono whitespace-nowrap">{c.topic}</span>, c.rule])} />
      </Panel>
    </div>
  )
}

function Imported() {
  const { p } = useStore()
  const im = p.imported!
  return (
    <div className="space-y-4">
      <Panel title={im.title} sub={`Protocol ${im.protocol} · imported ${im.importedUtc.slice(0, 16).replace('T', ' ')} UTC from “${im.source}”`} right={<Pill tone="purple">CDM Console study</Pill>}>
        <ul className="list-disc pl-5 text-sm space-y-1">{im.notes.map((n) => <li key={n}>{n}</li>)}</ul>
      </Panel>
      <Panel title="Schedule used for VISITNUM and VISIT">
        <Table head={['Console visit', 'VISITNUM', 'VISIT', 'Planned day']} rows={im.visits.map((v) => [<span className="font-mono">{v.raw}</span>, v.num, v.name, v.day])} />
      </Panel>
      <Panel title="Forms">
        <Table head={['Form', 'Rows']} rows={Object.entries(im.forms).map(([f, r]) => [<span className="font-mono">{f}</span>, r.length])} />
      </Panel>
    </div>
  )
}
