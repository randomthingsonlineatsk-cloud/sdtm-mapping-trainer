import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { Project } from './domain/project'
import { createProject, migrate } from './domain/project'
import { registerCustom } from './domain/standards'
import { listProjects, saveProject } from './domain/store'
import { restoreCt } from './domain/ctload'

interface Store { p: Project; tick: number; act: (fn: (p: Project) => void) => boolean; replace: (p: Project) => void; error: string; setError: (s: string) => void; saved: string }
const Ctx = createContext<Store | null>(null)
export const useStore = () => useContext(Ctx)!

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<Project | null>(null)
  const [tick, setTick] = useState(0)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => {
    restoreCt().then(() => listProjects()).then((all) => {
      const last = all.sort((a, b) => b.updatedUtc.localeCompare(a.updatedUtc))[0]
      ref.current = last ? migrate(last) : createProject()
    }).catch(() => { ref.current = createProject() }).finally(() => { setReady(true); setTick((t) => t + 1) })
  }, [])
  const pending = useRef(false)
  const save = useCallback(() => {
    window.clearTimeout(timer.current); pending.current = false
    if (!ref.current) return
    ref.current.updatedUtc = new Date().toISOString()
    saveProject(ref.current).then(() => setSaved(new Date().toLocaleTimeString())).catch((e) => setError(`Could not save to this browser: ${(e as Error).message}`))
  }, [])
  // A change still waiting to be saved is written at once when the page is hidden or closed.
  useEffect(() => {
    const flush = () => { if (pending.current) save() }
    const vis = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', vis)
    return () => { window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', vis) }
  }, [save])
  const persist = useCallback(() => {
    window.clearTimeout(timer.current); pending.current = true
    timer.current = window.setTimeout(save, 400)
  }, [])
  const act = useCallback((fn: (p: Project) => void) => {
    try { fn(ref.current!); setError(''); return true } catch (e) { setError((e as Error).message); return false } finally { setTick((t) => t + 1); persist() }
  }, [persist])
  const replace = useCallback((np: Project) => { ref.current = np; setTick((t) => t + 1); persist() }, [persist])
  // The project's custom domains are part of the metadata every view reads.
  if (ref.current) registerCustom(ref.current.custom ?? [])
  if (!ready || !ref.current) return <div className="min-h-screen bg-lab-bg text-lab-text-muted grid place-items-center font-mono text-sm">Loading…</div>
  return <Ctx.Provider value={{ p: ref.current, tick, act, replace, error, setError, saved }}>{children}</Ctx.Provider>
}
