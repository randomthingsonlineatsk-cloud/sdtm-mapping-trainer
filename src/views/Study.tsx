import { useStore } from '../state'
import { STUDY, SITES, ARMS, VISITS, CONVENTIONS, LAB_STANDARDS, CRITERIA, PROTOCOL_FACTS } from '../domain/study'
import { LAB_NAME } from '../domain/seed'
import { decode } from '../domain/standards'
import { CT_INFO, VERSION_LABEL } from '../domain/standards'
import { raw } from '../domain/seed'
import { Panel, Table, Stat, Pill } from './ui'
import { isPk } from '../domain/project'
import { AIR_STUDY, AIR_VENDOR, airRaw } from '../domain/air'
import { VAX_STUDY, VAX_DIARY, VAX_LAB, vaxRaw } from '../domain/vax'
import { PACKS } from '../domain/studies'
import { ONK_STUDY, ONK_ARMS, ONK_SITES, ONK_VISITS, ONK_FACTS, ONK_CONVENTIONS, ONK_IRC, ONK_CUT, onkRaw } from '../domain/onc'

// The asthma and vaccine studies: the same layout from the pack, with each study's own figures.
function PackStudy({ id }: { id: string }) {
  const { p } = useStore()
  const pack = PACKS[id]
  const air = id === AIR_STUDY.id
  const { forms, subjects } = air ? airRaw() : vaxRaw()
  const rand = subjects.filter((s) => s.arm)
  const stats: [string, number, ('blue' | 'red')?][] = air
    ? [['Screened', subjects.length], ['Randomised', rand.length, 'blue'], ['Spirometry sessions', forms.SPI.filter((r) => r.TRIAL === 'BEST').length], ['Questionnaires', forms.ASD.length]]
    : [['Consented', subjects.length], ['Vaccinated', rand.length, 'blue'], ['Doses', forms.VAX.length], ['Diary rows', forms.DIARY.length], ['Serum samples', forms.IMM.length]]
  return (
    <div className="space-y-4">
      <Panel title={pack.title} sub={`Protocol ${pack.id} · ${pack.sponsor} · ${pack.phase} · ${pack.indication}`} right={<Pill tone="blue">Fictional</Pill>}>
        <p className="text-sm">{pack.design}.</p>
        <div className={`grid grid-cols-2 ${stats.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-5"} gap-2`}>{stats.map(([l, v, t]) => <Stat key={l} label={l} value={v} tone={t} />)}</div>
        <p className="text-xs text-lab-text-muted">Standard: {VERSION_LABEL[p.version]}. Terminology: {CT_INFO.label}. Sites: {pack.sites.map((x) => `${x.id} ${x.name}, ${x.country} (${x.iso})`).join('; ')}. {air ? `Spirometry: ${AIR_VENDOR}.` : `E-diary: ${VAX_DIARY}. Serology: ${VAX_LAB}.`}</p>
      </Panel>
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Arms" sub="Planned arms, as they appear in DM."><Table head={['ARMCD', 'ARM']} rows={pack.arms.map((a) => [<span className="font-mono">{a.code}</span>, a.name])} /></Panel>
        <Panel title="Raw sources" sub="What each form or transfer holds."><Table head={['Form', 'Source', 'What it holds']} rows={Object.entries(pack.formInfo).map(([k, f]) => [<span className="font-mono">{k}</span>, f.source, f.note])} /></Panel>
      </div>
      <Panel title="Schedule (visits)"><Table head={['Visit (raw)', 'VISITNUM', 'VISIT', 'Planned day']} rows={pack.visits.map((v) => [v.raw, v.num, <span className="font-mono">{v.name}</span>, v.day])} /></Panel>
      <Panel title="Protocol facts"><Table head={['Item', 'Protocol']} rows={pack.facts.map((f) => [<span className="whitespace-nowrap">{f.what}</span>, f.value])} /></Panel>
      <Panel title="SDTM conventions for this study" sub="The sponsor’s rules for what the SDTMIG leaves to the sponsor. The reference mappings that score the missions follow them exactly.">
        <Table head={['Topic', 'Convention']} rows={pack.conventions.map((c) => [<span className="font-mono whitespace-nowrap">{c.topic}</span>, c.rule])} />
      </Panel>
    </div>
  )
}

function OnkStudy() {
  const { p } = useStore()
  const { forms, subjects } = onkRaw()
  const rand = subjects.filter((s) => s.arm)
  return (
    <div className="space-y-4">
      <Panel title={ONK_STUDY.title} sub={`Protocol ${ONK_STUDY.id} · ${ONK_STUDY.sponsor} · ${ONK_STUDY.phase} · ${ONK_STUDY.indication}`} right={<Pill tone="blue">Fictional</Pill>}>
        <p className="text-sm">{ONK_STUDY.design}.</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Stat label="Screened" value={subjects.length} /><Stat label="Randomised" value={rand.length} tone="blue" />
          <Stat label="Lesions" value={forms.TUI.length} /><Stat label="Assessments" value={forms.RSP.length} /><Stat label="Deaths" value={forms.DTH.length} tone="red" />
        </div>
        <p className="text-xs text-lab-text-muted">Standard: {VERSION_LABEL[p.version]}. Terminology: {CT_INFO.label}. Sites: {ONK_SITES.map((x) => `${x.id} ${x.name}, ${x.country} (${x.iso})`).join('; ')}. Independent review: {ONK_IRC}. Data cut-off {ONK_CUT}.</p>
      </Panel>
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Arms" sub="Planned arms, as they appear in DM."><Table head={['ARMCD', 'ARM']} rows={ONK_ARMS.map((a) => [<span className="font-mono">{a.code}</span>, a.name])} /></Panel>
        <Panel title="RECIST 1.1 in brief" sub="How the responses in the data are worked out.">
          <Table head={['Response', 'Target lesions (sum of diameters)']} rows={[
            ['CR', 'All target lesions gone; lymph nodes below 10 mm short axis'], ['PR', 'At least 30% below the baseline sum'],
            ['PD', 'At least 20% and 5 mm above the smallest sum so far, or any new lesion, or unequivocal progression of non-target disease'], ['SD', 'Neither PR nor PD'], ['NE', 'Not evaluable (scan not done or incomplete)'],
          ]} />
        </Panel>
      </div>
      <Panel title="Schedule (visits)" sub="Tumour assessments every 6 weeks from randomisation, whether or not the subject is still on treatment."><Table head={['Visit (raw)', 'VISITNUM', 'VISIT', 'Planned day']} rows={ONK_VISITS.map((v) => [v.raw, v.num, <span className="font-mono">{v.name}</span>, v.day])} /></Panel>
      <Panel title="Protocol facts"><Table head={['Item', 'Protocol']} rows={ONK_FACTS.map((f) => [<span className="whitespace-nowrap">{f.what}</span>, f.value])} /></Panel>
      <Panel title="SDTM conventions for this study" sub="The sponsor’s rules for what the SDTMIG leaves to the sponsor. The reference mappings that score the missions follow them exactly.">
        <Table head={['Topic', 'Convention']} rows={ONK_CONVENTIONS.map((c) => [<span className="font-mono whitespace-nowrap">{c.topic}</span>, c.rule])} />
      </Panel>
    </div>
  )
}
import { PK_STUDY, PK_ARMS, PK_SITES, PK_VISITS, PK_FACTS, PK_CONVENTIONS, PK_SCHEDULE, PK_LAB, PK_LLOQ, pkRaw } from '../domain/pk'

function PkStudy() {
  const { p } = useStore()
  const { forms, subjects } = pkRaw()
  const rand = subjects.filter((s) => s.arm)
  return (
    <div className="space-y-4">
      <Panel title={PK_STUDY.title} sub={`Protocol ${PK_STUDY.id} · ${PK_STUDY.sponsor} · ${PK_STUDY.phase} · ${PK_STUDY.indication}`} right={<Pill tone="blue">Fictional</Pill>}>
        <p className="text-sm">{PK_STUDY.design}.</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Stat label="Screened" value={subjects.length} /><Stat label="Screen failures" value={subjects.length - rand.length} tone="amber" />
          <Stat label="Randomised" value={rand.length} tone="blue" /><Stat label="Plasma samples" value={new Set(forms.PCL.map((r) => r.ACCSNUM)).size} /><Stat label="PK parameters" value={forms.PKP.length} tone="green" />
        </div>
        <p className="text-xs text-lab-text-muted">Standard: {VERSION_LABEL[p.version]}. Terminology: {CT_INFO.label}. Site: {PK_SITES.map((x) => `${x.id} ${x.name}, ${x.country} (${x.iso})`).join('; ')}.</p>
      </Panel>
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Arms" sub="Planned arms, as they appear in DM. Each cohort of 8: 6 active, 2 placebo.">
          <Table head={['ARMCD', 'ARM', 'Part', 'Dose']} rows={PK_ARMS.map((a) => [<span className="font-mono">{a.code}</span>, a.name, a.part === 'A' ? 'A (SAD)' : 'B (MAD)', a.dose ? `${a.dose} mg` : 'placebo'])} />
        </Panel>
        <Panel title="PK sampling" sub={`Nominal hours after the reference dose. Plasma PKX-07 by ${PK_LAB}, LLOQ ${PK_LLOQ.toFixed(2)} ng/mL.`}>
          <Table head={['Profile', 'Reference dose', 'Nominal times (h)']} rows={[
            ['Part A', 'Day 1', PK_SCHEDULE.SAD.join(', ')], ['Part B, Day 1', 'Day 1', PK_SCHEDULE.MAD1.join(', ')],
            ['Part B, troughs', 'Days 3 to 6', PK_SCHEDULE.TROUGH.join(', ')], ['Part B, Day 7', 'Day 7', PK_SCHEDULE.MAD7.join(', ')],
          ]} />
          <p className="text-[11px] text-lab-text-muted">−0.25 is the pre-dose sample, drawn within 15 minutes before the dose. 24 h and 48 h samples are drawn on the following days but are timed from the reference dose.</p>
        </Panel>
      </div>
      <Panel title="Schedule (visits)" sub="Visit names in the EDC and the lab file, with the SDTM visit number and name.">
        <Table head={['Visit (raw)', 'VISITNUM', 'VISIT', 'Planned day']} rows={PK_VISITS.map((v) => [v.raw, v.num, <span className="font-mono">{v.name}</span>, v.day])} />
      </Panel>
      <Panel title="Protocol facts"><Table head={['Item', 'Protocol']} rows={PK_FACTS.map((f) => [<span className="whitespace-nowrap">{f.what}</span>, f.value])} /></Panel>
      <Panel title="SDTM conventions for this study" sub="The sponsor’s rules for what the SDTMIG leaves to the sponsor. The reference mappings that score the missions follow them exactly.">
        <Table head={['Topic', 'Convention']} rows={PK_CONVENTIONS.map((c) => [<span className="font-mono whitespace-nowrap">{c.topic}</span>, c.rule])} />
      </Panel>
    </div>
  )
}

export default function StudyView() {
  const { p } = useStore()
  if (p.imported) return <Imported />
  if (isPk(p)) return <PkStudy />
  if (p.study === ONK_STUDY.id) return <OnkStudy />
  if (p.study === AIR_STUDY.id || p.study === VAX_STUDY.id) return <PackStudy id={p.study} />
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
