import { useStore } from '../state'
import { STUDY, SITES, ARMS, VISITS, CONVENTIONS, LAB_STANDARDS, CRITERIA, PROTOCOL_FACTS } from '../domain/study'
import { LAB_NAME } from '../domain/seed'
import { decode } from '../domain/standards'
import { CT_INFO, VERSION_LABEL } from '../domain/standards'
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
        <p className="text-xs text-lab-text-muted">Standard: {VERSION_LABEL[p.version]}. Terminology: {CT_INFO.label}.</p>
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
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Protocol facts" sub="What the trial design domains (TA, TE, TV, TI, TS) are built from.">
          <Table head={['Item', 'Protocol']} rows={PROTOCOL_FACTS.map((f) => [<span className="whitespace-nowrap">{f.what}</span>, f.value])} />
        </Panel>
        <Panel title="Eligibility criteria" sub="Protocol version 1. For TI, and for IE when a subject fails one.">
          <Table head={['Code', 'Category', 'Criterion']} rows={CRITERIA.map((c) => [<span className="font-mono">{c.code}</span>, c.cat, c.text])} />
        </Panel>
      </div>
      <Panel title="Laboratory standards" sub={`From the data transfer agreement with ${LAB_NAME} and the sponsor’s lab standards: the vendor’s test codes, the SDTM test code, the standard (SI) unit, the factor from the conventional unit and the decimals to report.`}>
        <Table head={['Vendor code', 'LBTESTCD', 'LBTEST', 'Standard unit', 'Factor (conventional → standard)', 'Decimals', 'Specimen']} rows={LAB_STANDARDS.map((l) => [<span className="font-mono">{l.vendor}</span>, <span className="font-mono">{l.testcd}</span>, decode('LBTESTCD', l.testcd), <span className="font-mono">{l.stdunit}</span>, l.factor, l.decimals, l.spec])} />
        <p className="text-[11px] text-lab-text-muted">The lab sends results in conventional units (mg/dL for glucose, creatinine and cholesterol). LBORRES and LBORRESU keep what the lab reported; LBSTRESC, LBSTRESN and LBSTRESU carry the standardised result. The reference range is converted with the same factor.</p>
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
