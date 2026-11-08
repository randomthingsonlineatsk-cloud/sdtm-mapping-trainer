import { useEffect, useRef, useState } from 'react'
import { useStore } from '../state'
import { PK_STUDY } from '../domain/pk'
import { createProject, log, migrate, isGlv, type Project } from '../domain/project'
import { exportFile, importFile, deleteProject, listProjects, saveProject, download } from '../domain/store'
import { importCdmProject } from '../domain/cdmImport'
import { VERSION_LABEL, DRAFT_CHANGES, CT_INFO, type Version } from '../domain/standards'
import { Panel, Pill, Btn, Table, ic } from './ui'
import { TransferSwitch } from './Transfer'
import { parseCt, applyCt, saveCt } from '../domain/ctload'
import { CT } from '../domain/standards'

const LINKS = [
  { name: 'CDM Query & Edit-Check Console', url: 'https://randomthingsonlineatsk-cloud.github.io/cdm-query-console/', what: 'Where the raw data comes from: edit checks, queries, coding, reconciliation and lock on HLV-204-201 and the vaccine trial ALV-3-301. Its project files import here.' },
  { name: 'eCTD Dossier Builder', url: 'https://randomthingsonlineatsk-cloud.github.io/ectd-dossier-builder/', what: 'Where SDTM datasets end up: Module 5 of the submission.' },
  { name: 'EDC Study Build Lab (planned)', url: '', what: 'Designs the eCRF and the edit checks that produce the raw data.' },
  { name: 'TLF Programming Lab (planned)', url: '', what: 'Takes these SDTM datasets on to ADaM, tables, listings and figures.' },
]

export default function ProjectView() {
  const { p, act, replace } = useStore()
  const [all, setAll] = useState<Project[]>([])
  const [msg, setMsg] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const file = useRef<HTMLInputElement>(null), cdm = useRef<HTMLInputElement>(null), ctf = useRef<HTMLInputElement>(null)
  const [ctMsg, setCtMsg] = useState('')
  const refresh = () => listProjects().then((x) => setAll(x.sort((a, b) => b.updatedUtc.localeCompare(a.updatedUtc)))).catch(() => setAll([]))
  useEffect(() => { refresh() }, [p.id, p.updatedUtc])
  const switchTo = (np: Project) => { saveProject(p).finally(() => { replace(np); refresh() }) }
  const readFile = (f: File, fn: (text: string) => void) => { const r = new FileReader(); r.onload = () => { try { fn(String(r.result)) } catch (e) { setMsg((e as Error).message) } }; r.readAsText(f) }
  const setVersion = (v: Version) => act((pp) => { pp.version = v; log(pp, `Standard switched to ${VERSION_LABEL[v]}`) })
  return (
    <div className="space-y-4">
      <Panel title="This project" sub="Saved in this browser only. Export a file to keep a copy or move to another computer.">
        <div className="grid sm:grid-cols-3 gap-2">
          <label className="text-xs space-y-1"><span className="text-lab-text-muted">Project name</span><input className={ic('')} value={p.name} onChange={(e) => act((pp) => { pp.name = e.target.value })} /></label>
          <label className="text-xs space-y-1"><span className="text-lab-text-muted">User ID</span><input className={ic('font-mono')} value={p.userId} onChange={(e) => act((pp) => { pp.userId = e.target.value.trim() || 'local-user' })} /></label>
          <label className="text-xs space-y-1"><span className="text-lab-text-muted">Class ID (for classroom mode, Phase 5)</span><input className={ic('font-mono')} value={p.classId} onChange={(e) => act((pp) => { pp.classId = e.target.value.trim() || 'none' })} /></label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => download(`${p.name.replace(/[^\w-]+/g, '_')}.sdtm-trainer.json`, exportFile(p))}>Export project file</Btn>
          <Btn tone="grey" onClick={() => file.current?.click()}>Import project file</Btn>
          <input ref={file} type="file" accept=".json,application/json" className="hidden" aria-label="Project file" onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f, (t) => { const r = importFile(t); switchTo(r.project); setMsg(['Project imported.', ...r.warnings].join(' ')) }); e.target.value = '' }} />
          <Btn tone="grey" onClick={() => switchTo(createProject(p.userId, p.classId, p.version))}>New GLV-12-301 project (phase 3)</Btn>
          <Btn tone="grey" onClick={() => switchTo(createProject(p.userId, p.classId, p.version, PK_STUDY.id))}>New PKX-07-101 project (phase 1 PK)</Btn>
          <Btn tone="grey" onClick={() => switchTo(createProject(p.userId, p.classId, p.version, 'ONK-44-302'))}>New ONK-44-302 project (phase 3 oncology)</Btn>
          <Btn tone="grey" onClick={() => switchTo(createProject(p.userId, p.classId, p.version, 'AIR-09-202'))}>New AIR-09-202 project (phase 2 asthma)</Btn>
          <Btn tone="grey" onClick={() => switchTo(createProject(p.userId, p.classId, p.version, 'ALV-3-301'))}>New ALV-3-301 project (phase 3 vaccine)</Btn>
          <Btn tone="grey" onClick={() => switchTo(createProject(p.userId, p.classId, p.version, 'ZEN-T-0428'))}>New ZEN-T-0428 project (SEND rat toxicity)</Btn>
          <Btn tone="grey" onClick={() => switchTo(createProject(p.userId, p.classId, p.version, 'INS-22-305'))}>New INS-22-305 project (diabetes, insulin)</Btn>
          <Btn tone="grey" onClick={() => switchTo(createProject(p.userId, p.classId, p.version, 'CRD-31-401'))}>New CRD-31-401 project (cardiovascular)</Btn>
          <Btn tone="grey" onClick={() => switchTo(createProject(p.userId, p.classId, p.version, 'PNR-18-203'))}>New PNR-18-203 project (pain)</Btn>
          <Btn tone="grey" onClick={() => cdm.current?.click()}>Import a CDM Console study</Btn>
          <input ref={cdm} type="file" accept=".json,application/json" className="hidden" aria-label="CDM Console project file" onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f, (t) => { const im = importCdmProject(t); const np = createProject(p.userId, p.classId, p.version); np.study = im.protocol; np.imported = im; np.name = `${im.protocol} (imported) SDTM mapping`; log(np, `Imported ${im.protocol} from the CDM Console: ${Object.keys(im.forms).length} forms`); switchTo(np); setMsg(`Imported ${im.protocol}: ${Object.values(im.forms).reduce((a, r) => a + r.length, 0)} rows in ${Object.keys(im.forms).length} forms. Missions stay on GLV-12-301.`) }); e.target.value = '' }} />
        </div>
        {msg && <p className="text-xs text-lab-cdsco" role="status">{msg}</p>}
      </Panel>
      {isGlv(p) && <Panel title="Data transfer" sub="The study data arrive more than once. Your mappings stay as they are when you switch: re-run them on the new transfer and account for every change (Raw data and Datasets show what changed).">
        <TransferSwitch />
      </Panel>}
      <Panel title="Study Data Standardization Plan" sub="The program-level plan FDA asks sponsors to keep with the IND: every study of the program (one per project in this browser under your user ID) with its standard, terminology, define.xml version and dictionaries, how conformance is checked, and what goes in each eCTD module. Laid out after the PHUSE SDSP template.">
        <Btn tone="solid" onClick={async () => {
          const { buildSdsp } = await import('../domain/sdsp'); const { csdrgPdf } = await import('../domain/csdrgPdf')
          const projects = [...all.filter((x) => x.id !== p.id), p]
          const bytes = csdrgPdf('Program', buildSdsp(projects, p.userId), { author: p.userId, date: new Date().toISOString().slice(0, 10), title: 'Training program of the SDTM Mapping Trainer (fictional studies)', doc: 'Study Data Standardization Plan' })
          const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' })); const a = document.createElement('a'); a.href = url; a.download = 'sdsp.pdf'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
        }}>Download the SDSP (PDF)</Btn>
      </Panel>
      <Panel title="Standard" sub={`Which SDTM version this project maps to. Terminology: ${CT_INFO.label}.`}>
        <div className="flex flex-wrap gap-2">
          {((p.version === 'send' ? ['send'] : ['3.4', '4.0d']) as Version[]).map((v) => <Btn key={v} tone={p.version === v ? 'solid' : 'grey'} onClick={() => setVersion(v)}>{VERSION_LABEL[v]}</Btn>)}
        </div>
        {p.version === 'send'
          ? <p className="text-xs text-lab-text-muted">A nonclinical study: mapped to SEND (SENDIG v3.1.1), the standard FDA requires for the nonclinical studies it lists in its Data Standards Catalog. SEND datasets go in eCTD module 4.</p>
          : p.version === '4.0d'
          ? <div className="text-xs space-y-1"><p className="text-lab-ema">Draft mode. SDTMIG v4.0 is not final: it is built here from the public-review draft and will be updated when CDISC publishes the standard. FDA requires SDTMIG v3.4.</p><ul className="list-disc pl-5 text-lab-text-muted">{DRAFT_CHANGES.map((c) => <li key={c.what}>{c.what}</li>)}</ul></div>
          : <p className="text-xs text-lab-text-muted">SDTMIG v3.4 with SDTM v2.0: required by FDA for studies starting on or after 15 March 2025.</p>}
        <p className="text-[11px] text-lab-text-muted">Switching keeps your mappings. Variables that do not exist in the other version stay in your specification but are not part of the expected structure; missions record the version they ran against.</p>
      </Panel>
      <Panel title="Controlled terminology" sub="The trainer bundles the codelists its study needs. Load the full quarterly SDTM terminology file to map against every codelist: download the tab-delimited SDTM Terminology .txt file from the NCI EVS CDISC terminology page, then load it here. It is kept in this browser for all projects.">
        <p className="text-xs">In use: <b>{CT_INFO.label}</b> · {Object.keys(CT).length} codelists, {Object.values(CT).reduce((a, c) => a + c.terms.length, 0).toLocaleString()} terms.</p>
        <div className="flex flex-wrap gap-2">
          <Btn tone="grey" onClick={() => ctf.current?.click()}>Load an NCI EVS terminology file (.txt)</Btn>
          {CT_INFO.loaded && <Btn tone="red" onClick={() => { applyCt(null); saveCt(null).catch(() => {}); act(() => {}); setCtMsg('Back to the bundled terminology.') }}>Use the bundled terminology</Btn>}
          <input ref={ctf} type="file" accept=".txt,.tsv,text/plain,text/tab-separated-values" className="hidden" aria-label="Terminology file" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setCtMsg('Reading…'); readFile(f, (t) => { try { const ct = parseCt(t, f.name); applyCt(ct); saveCt(ct).catch(() => setCtMsg('Loaded, but this browser would not keep it for next time.')); act((pp) => log(pp, `Terminology loaded: ${ct.label}`)); setCtMsg(`Loaded ${ct.codelists.length} codelists.`) } catch (er) { setCtMsg((er as Error).message) } }) } e.target.value = '' }} />
        </div>
        {ctMsg && <p className="text-xs text-lab-cdsco" role="status">{ctMsg}</p>}
        <p className="text-[11px] text-lab-text-muted">Missions are scored with whichever terminology is in use; the study’s values are in both. A newer release may retire or add terms: the checks then report values that are no longer in their codelist.</p>
      </Panel>
      <Panel title="Saved projects" sub="All projects in this browser.">
        <Table head={['Project', 'Study', 'Standard', 'Missions', 'Updated', '']} rows={all.map((x) => [x.name, x.study, x.version === '3.4' ? 'v3.4' : x.version === 'send' ? 'SENDIG 3.1.1' : 'v4.0 draft', (x.missions ?? []).filter((m) => m.passed).length + ' passed', x.updatedUtc.slice(0, 16).replace('T', ' '),
          x.id === p.id ? <Pill tone="blue">Open</Pill> : <div className="flex gap-1"><Btn tone="grey" className="py-0.5" onClick={() => switchTo(migrate(x))}>Open</Btn>
            {confirmDel === x.id ? <Btn tone="red" className="py-0.5" onClick={() => { deleteProject(x.id).then(refresh); setConfirmDel(null) }}>Confirm delete</Btn> : <Btn tone="red" className="py-0.5" onClick={() => setConfirmDel(x.id)}>Delete</Btn>}</div>])} />
      </Panel>
      <Panel title="Related apps">
        <ul className="space-y-1 text-sm">{LINKS.map((l) => <li key={l.name}>{l.url ? <a className="text-lab-fda underline" href={l.url}>{l.name}</a> : <span>{l.name}</span>} <span className="text-lab-text-muted">· {l.what}</span></li>)}</ul>
      </Panel>
      <Panel title="Activity" sub="What you did in this project, newest first.">
        <Table head={['UTC', 'What']} rows={[...p.log].reverse().slice(0, 40).map((l) => [<span className="font-mono text-[11px]">{l.utc.slice(0, 19).replace('T', ' ')}</span>, l.what])} />
      </Panel>
    </div>
  )
}
