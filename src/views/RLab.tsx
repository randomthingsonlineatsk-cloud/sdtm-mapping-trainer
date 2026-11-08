import { useState } from 'react'
import { useStore } from '../state'
import { useNav } from '../App'
import { R_PRELUDE, R_HOME, R_HELP, sessionFiles, parseCsv, starterCode } from '../domain/rlib'
import { toR } from '../domain/codegen'
import { log, isGlv, packOf } from '../domain/project'
import { R_KEYS, missionsFor } from '../domain/missions'
import { Panel, Btn, Table, Stat, Select, Pill } from './ui'
import { useData } from './shared'

// One R session for the page, started on demand from the site's own copy of webR.
type WebRLike = { init(): Promise<void>; FS: { mkdir(p: string): Promise<unknown>; writeFile(p: string, d: Uint8Array): Promise<unknown>; readFile(p: string): Promise<Uint8Array> }; Shelter: new () => Promise<{ captureR(code: string, o: object): Promise<{ output: { type: string; data: unknown }[] }>; purge(): Promise<void> }> }
let session: Promise<WebRLike> | null = null
let loadedFor = ''
async function startR(files: Record<string, string>, key: string): Promise<WebRLike> {
  if (!session) {
    session = (async () => {
      const base = new URL('webr/', document.baseURI).href
      const mod = await import('webr')
      const w = new mod.WebR({ baseUrl: base }) as unknown as WebRLike
      await w.init()
      await w.FS.mkdir(`${R_HOME}/raw`).catch(() => undefined)
      return w
    })()
    session.catch(() => { session = null })
  }
  const w = await session
  if (loadedFor !== key) {
    for (const [f, text] of Object.entries(files)) await w.FS.writeFile(`${R_HOME}/${f}`, new TextEncoder().encode(text))
    await run(w, R_PRELUDE); loadedFor = key
  }
  return w
}
async function run(w: WebRLike, code: string): Promise<{ text: string; error: boolean }> {
  const sh = await new w.Shelter()
  try {
    const r = await sh.captureR(code, { captureStreams: true, captureConditions: true, withAutoprint: true, captureGraphics: false })
    let error = false
    const lines: string[] = []
    for (const o of r.output) {
      if (o.type === 'stdout' || o.type === 'stderr') { lines.push(String(o.data)); continue }
      // Conditions arrive as R objects: read their message.
      let m = ''
      try { const js = await (o.data as { get(k: string): Promise<{ toJs(): Promise<{ values: string[] }> }> }).get('message').then((x) => x.toJs()); m = js.values.join(' ') } catch { m = String(o.data) }
      if (o.type === 'error') error = true
      m = m.replace(/^Error in `eval\(ei, envir\)`: /, '')
      lines.push(o.type === 'error' ? `Error: ${m}` : o.type === 'warning' ? `Warning: ${m}` : m)
    }
    const text = lines.join('\n')
    return { text, error }
  } catch (e) { return { text: `Error: ${(e as Error).message}`, error: true } }
  finally { await sh.purge() }
}

export default function RLab() {
  const { p, act } = useStore()
  const { go } = useNav()
  const data = useData()
  const rMissions = missionsFor(p).filter((m) => m.kind === 'r')
  const domains = [...new Set([...rMissions.flatMap((m) => m.domains), ...(isGlv(p) ? Object.keys(R_KEYS) : []), ...Object.keys(p.specs)])].sort()
  const first = rMissions[0]?.domains[0] ?? (domains.includes('CM') ? 'CM' : domains[0] ?? 'CM')
  const pack = packOf(p)
  const tmpl = (x: string) => starterCode(x, pack?.domains.includes(x) ? pack.refSpec(x, p.version).source : undefined)
  const [d, setD] = useState(first)
  const [code, setCode] = useState(p.rCode?.[d] ?? tmpl(d))
  const [out, setOut] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'running' | 'failed'>(session ? 'ready' : 'idle')
  const [frame, setFrame] = useState<{ cols: string[]; rows: string[][] } | null>(null)
  if (p.imported) return <Panel title="R" sub="R runs on the trainer’s studies."><p className="text-sm">Open a project on one of the trainer’s studies.</p></Panel>
  const key = `${p.study}|${p.transfer ?? 1}`
  const keep = (c: string) => act((pp) => { (pp.rCode ??= {})[d] = c })
  const pick = (x: string) => { setD(x); setCode(p.rCode?.[x] ?? tmpl(x)); setFrame(null) }
  const exec = async (save: boolean) => {
    setState(session ? 'running' : 'loading')
    try {
      const w = await startR(sessionFiles(data), key)
      setState('running')
      const r = await run(w, code)
      const obj = d.toLowerCase()
      const chk = await run(w, `if (exists("${obj}") && is.data.frame(${obj})) { write.csv(${obj}, "/tmp/out.csv", row.names = FALSE, na = ""); cat("ok") } else cat("none")`)
      let f: { cols: string[]; rows: string[][] } | null = null
      if (chk.text.trim() === 'ok') { const t = parseCsv(new TextDecoder().decode(await w.FS.readFile('/tmp/out.csv'))); f = { cols: t[0] ?? [], rows: t.slice(1) } }
      setOut(r.text || '(no output)'); setFrame(f); setState('ready')
      keep(code)
      if (save) {
        if (r.error || !f) { setOut(`${r.text}\n\nNot saved: ${r.error ? 'the program stopped with an error' : `there is no data frame called ${obj}`}.`); return }
        act((pp) => { (pp.rOut ??= {})[d] = { code, utc: new Date().toISOString(), cols: f!.cols, rows: f!.rows }; log(pp, `R program for ${d} saved (${f!.rows.length} records)`) })
      }
    } catch (e) { setOut(`R could not start: ${(e as Error).message}`); setState('failed') }
  }
  const saved = p.rOut?.[d]
  return (
    <div className="space-y-4">
      <Panel title="R" sub="Real R (webR: R compiled to WebAssembly) running in your browser, served from this site. Base R only, with the study’s raw forms already loaded and a few helper functions. Write a program that builds a data frame named after the domain (cm for CM), run it, and save its result: the study’s R mission scores the saved result like any other dataset."
        right={<div className="flex gap-1"><Select aria-label="Domain" className="w-28" value={d} onChange={(e) => pick(e.target.value)} options={domains.map((x) => ({ value: x, label: x }))} /></div>}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="R" value={state === 'idle' ? 'not started' : state === 'loading' ? 'starting…' : state === 'failed' ? 'failed' : 'ready'} tone={state === 'failed' ? 'red' : state === 'ready' || state === 'running' ? 'green' : 'blue'} />
          <Stat label="Data frame" value={frame ? `${frame.rows.length} × ${frame.cols.length}` : '–'} />
          <Stat label="Saved for scoring" value={saved ? `${saved.rows.length} records` : 'no'} tone={saved ? 'green' : 'amber'} />
          <Stat label="Study" value={p.study} />
        </div>
        {state === 'idle' && <p className="text-xs text-lab-text-muted">The first run downloads R (about 45 MB, from this site) and keeps it in your browser’s cache.</p>}
      </Panel>
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <Panel title={`Program: ${d.toLowerCase()}`} right={<div className="flex flex-wrap gap-1">
          <Btn tone="solid" disabled={state === 'loading' || state === 'running'} onClick={() => exec(false)}>{state === 'loading' ? 'Starting R…' : state === 'running' ? 'Running…' : 'Run'}</Btn>
          <Btn tone="green" disabled={state === 'loading' || state === 'running'} onClick={() => exec(true)}>Run and save the result</Btn>
        </div>}>
          <textarea aria-label="R program" spellCheck={false} className="w-full min-h-[22rem] rounded border border-lab-line bg-lab-panel-strong p-2 font-mono text-[12px] leading-5" value={code} onChange={(e) => setCode(e.target.value)} onBlur={() => keep(code)} />
          <div className="flex flex-wrap gap-1">
            <Btn tone="grey" className="py-0.5" onClick={() => setCode(tmpl(d))}>Start again from the template</Btn>
            {p.specs[d]?.vars.length ? <Btn tone="grey" className="py-0.5" onClick={() => setCode(`${code}\n\n# Your visual mapping, as the R sketch on the Mapping tab (uses dplyr, which this session does not have):\n${toR(p.specs[d], p.version).split('\n').map((l) => `# ${l}`).join('\n')}\n`)}>Append my mapping’s R sketch as comments</Btn> : null}
            {rMissions.map((m) => <Btn key={m.id} tone="grey" className="py-0.5" onClick={() => go('missions')}>Mission {m.id}</Btn>)}
          </div>
        </Panel>
        <div className="space-y-4">
          <Panel title="Output"><pre aria-label="R output" className="max-h-80 overflow-auto whitespace-pre-wrap rounded bg-lab-panel-strong p-2 font-mono text-[11px]">{out || 'Run the program to see its output.'}</pre></Panel>
          <Panel title="In the session"><Table head={['Name', 'What']} rows={R_HELP.map((h) => [<span className="font-mono text-[11px]">{h.sig}</span>, <span className="text-[11px]">{h.what}</span>])} /></Panel>
        </div>
      </div>
      {frame && <Panel title={`${d.toLowerCase()} · first 20 of ${frame.rows.length} records`} right={saved ? <Pill tone="green">saved {saved.utc.slice(0, 16).replace('T', ' ')} UTC</Pill> : null}>
        <Table head={frame.cols} rows={frame.rows.slice(0, 20).map((r) => r.map((c, i) => <span key={i} className="font-mono text-[11px] whitespace-nowrap">{c}</span>))} />
      </Panel>}
    </div>
  )
}
