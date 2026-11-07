import { createContext, useContext, useState } from 'react'
import { StoreProvider, useStore } from './state'
import { VERSION_LABEL } from './domain/standards'
import { STUDY } from './domain/study'
import { Pill } from './views/ui'
import Learn from './views/Learn'
import StudyView from './views/Study'
import RawData from './views/RawData'
import Mapping from './views/Mapping'
import Datasets from './views/Datasets'
import Design from './views/Design'
import Qc from './views/Qc'
import PlanView from './views/Plan'
import Relations from './views/Relations'
import Acrf from './views/Acrf'
import Define from './views/Define'
import Validation from './views/Validation'
import Csdrg from './views/Csdrg'
import Submission from './views/Submission'
import Missions from './views/Missions'
import ProjectView from './views/ProjectView'

export type View = 'learn' | 'study' | 'raw' | 'mapping' | 'design' | 'datasets' | 'qc' | 'plan' | 'relations' | 'acrf' | 'define' | 'validation' | 'csdrg' | 'submission' | 'missions' | 'project'
interface Nav { view: View; arg?: string; go: (v: View, arg?: string) => void }
const NavCtx = createContext<Nav>({ view: 'learn', go: () => {} })
export const useNav = () => useContext(NavCtx)

const VIEWS: { id: View; label: string }[] = [
  { id: 'learn', label: 'Learn' }, { id: 'study', label: 'Study' }, { id: 'raw', label: 'Raw data' }, { id: 'plan', label: 'Specification' }, { id: 'mapping', label: 'Mapping' }, { id: 'design', label: 'Trial design' }, { id: 'relations', label: 'Relationships' }, { id: 'acrf', label: 'aCRF' }, { id: 'define', label: 'define.xml' }, { id: 'qc', label: 'QC compare' },
  { id: 'datasets', label: 'Datasets & checks' }, { id: 'validation', label: 'Validation' }, { id: 'csdrg', label: 'Reviewer’s guide' }, { id: 'submission', label: 'Submission' }, { id: 'missions', label: 'Missions' }, { id: 'project', label: 'Project' },
]

function Shell() {
  const { p, error, setError, saved } = useStore()
  const [nav, setNav] = useState<{ view: View; arg?: string }>({ view: 'learn' })
  const go = (view: View, arg?: string) => { setNav({ view, arg }); window.scrollTo({ top: 0 }) }
  const V = { learn: Learn, study: StudyView, raw: RawData, plan: PlanView, mapping: Mapping, design: Design, relations: Relations, acrf: Acrf, define: Define, qc: Qc, datasets: Datasets, validation: Validation, csdrg: Csdrg, submission: Submission, missions: Missions, project: ProjectView }[nav.view]
  return (
    <NavCtx.Provider value={{ ...nav, go }}>
      <div className="min-h-screen bg-lab-bg text-lab-text flex flex-col">
        <header className="border-b border-lab-line bg-lab-panel/60">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="font-mono text-sm text-lab-fda">SDTM Mapping Trainer</h1>
              <p className="text-[11px] text-lab-text-muted">{p.imported ? `${p.imported.protocol} · imported from the CDM Console` : `${STUDY.id} · ${STUDY.short}`} · fictional study for training</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={p.version === '3.4' ? 'blue' : 'purple'}>{VERSION_LABEL[p.version]}</Pill>
              {!p.imported && (p.transfer ?? 1) === 2 && <Pill tone="amber">Transfer 2</Pill>}
              <span className="text-[11px] text-lab-text-muted font-mono">{p.name}{saved ? ` · saved ${saved}` : ''}</span>
            </div>
          </div>
          <nav className="max-w-7xl mx-auto px-4 flex flex-wrap gap-1" aria-label="Main">
            {VIEWS.map((v) => (
              <button key={v.id} onClick={() => go(v.id)} aria-current={nav.view === v.id ? 'page' : undefined}
                className={`px-3 py-1.5 font-mono text-xs border-b-2 ${nav.view === v.id ? 'border-lab-fda text-lab-fda' : 'border-transparent text-lab-text-muted hover:text-lab-text'}`}>{v.label}</button>
            ))}
          </nav>
        </header>
        {error && <div role="alert" className="max-w-7xl mx-auto w-full px-4 pt-3"><div className="rounded border border-lab-red/60 bg-lab-red-soft px-3 py-2 text-sm text-lab-red flex justify-between gap-2"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss" className="px-1">✕</button></div></div>}
        <main className="max-w-7xl mx-auto w-full px-4 py-4 flex-1"><V key={`${nav.view}|${nav.arg ?? ''}`} /></main>
        <footer className="border-t border-lab-line text-[11px] text-lab-text-muted">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap justify-between gap-2">
            <span>Built by Khan Gulrez Shagufa Fazal Ahmed · Apache-2.0 · <a className="underline" href="https://github.com/randomthingsonlineatsk-cloud/sdtm-mapping-trainer">source</a></span>
            <span>Training only. All studies, sites, subjects and data are fictional; not a validated system. CDISC standards are used as published by CDISC.</span>
          </div>
        </footer>
      </div>
    </NavCtx.Provider>
  )
}

export default function App() { return <StoreProvider><Shell /></StoreProvider> }
