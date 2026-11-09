import type { Trace, TraceNode } from '../domain/trace'
import { Panel, Btn } from './ui'

// The traceability graph for one SDTM value: source → raw record → rule → value → define.xml,
// with the approved specification above the rule and the validation findings below the value.
const POS: Record<TraceNode['id'], [number, number]> = { source: [0, 1], raw: [1, 1], spec: [2, 0], rule: [2, 1], value: [3, 1], define: [4, 1], findings: [3, 2] }
const W = 196, GAPX = 84, GAPY = 28, PAD = 10, LINE = 15, CH = 30
const TONE: Record<TraceNode['tone'], [string, string]> = {
  blue: ['var(--color-lab-fda-soft, #dbeafe)', 'var(--color-lab-fda, #2563eb)'], green: ['var(--color-lab-cdsco-soft, #dcfce7)', 'var(--color-lab-cdsco, #15803d)'],
  amber: ['var(--color-lab-amber-soft, #fef3c7)', 'var(--color-lab-amber, #b45309)'], red: ['var(--color-lab-red-soft, #fee2e2)', 'var(--color-lab-red, #b91c1c)'],
  grey: ['var(--color-lab-panel-strong, #f1f5f9)', 'var(--color-lab-text-muted, #64748b)'], purple: ['var(--color-lab-ema-soft, #ede9fe)', 'var(--color-lab-ema, #6d28d9)'],
}
function wrap(t: string, n = CH): string[] {
  const out: string[] = []; let cur = ''
  for (const w of t.split(/\s+/)) { if ((cur + ' ' + w).trim().length > n) { if (cur) out.push(cur); cur = w.length > n ? w.slice(0, n - 1) + '…' : w } else cur = (cur + ' ' + w).trim() }
  if (cur) out.push(cur)
  return out
}

export function TraceGraph({ trace, onClose }: { trace: Trace; onClose: () => void }) {
  const laid = trace.nodes.map((n) => ({ n, lines: n.lines.flatMap((l) => wrap(l)).slice(0, 8) }))
  const rowH = [0, 1, 2].map((r) => Math.max(60, ...laid.filter((x) => POS[x.n.id][1] === r).map((x) => PAD * 2 + LINE * (x.lines.length + 1))))
  const y0 = (r: number) => rowH.slice(0, r).reduce((s, h) => s + h + GAPY, 0)
  const box = (id: TraceNode['id']) => { const [c, r] = POS[id]; const h = PAD * 2 + LINE * ((laid.find((x) => x.n.id === id)?.lines.length ?? 0) + 1); return { x: c * (W + GAPX), y: y0(r) + (r === 1 ? (rowH[1] - h) / 2 : r === 0 ? rowH[0] - h : 0), w: W, h } }
  const width = 5 * W + 4 * GAPX, height = y0(2) + rowH[2]
  const edge = ([a, b, label]: Trace['edges'][number], i: number) => {
    const A = box(a), B = box(b)
    const horiz = POS[a][1] === POS[b][1]
    const [x1, y1, x2, y2] = horiz ? [A.x + A.w, A.y + A.h / 2, B.x, B.y + B.h / 2] : POS[a][1] < POS[b][1] ? [A.x + A.w / 2, A.y + A.h, B.x + B.w / 2, B.y] : [A.x + A.w / 2, A.y, B.x + B.w / 2, B.y + B.h]
    return <g key={i}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeOpacity={0.5} strokeWidth={1.5} markerEnd="url(#arrow)" /><text x={(x1 + x2) / 2 + (horiz ? 0 : 6)} y={(y1 + y2) / 2 - (horiz ? 5 : 0)} fontSize={10} textAnchor={horiz ? 'middle' : 'start'} fill="currentColor" fillOpacity={0.7}>{label.length > 15 && horiz ? `${label.slice(0, 14)}…` : label.length > 26 ? `${label.slice(0, 25)}…` : label}</text></g>
  }
  return (
    <Panel title={`Trace · ${trace.domain}.${trace.variable} = ${trace.value === '' ? '(null)' : `“${trace.value}”`}`} sub="From the value back to where it was collected: the CRF page or vendor file, the raw record and fields, your mapping rule and the approved specification, the define.xml origin, and the validation findings on it." right={<Btn tone="grey" onClick={onClose}>Close</Btn>}>
      <div className="overflow-x-auto" tabIndex={0} aria-label="Traceability graph">
        <svg width={width} height={height + 4} viewBox={`0 -2 ${width} ${height + 4}`} role="img" aria-label={trace.nodes.map((n) => `${n.title}: ${n.lines.join('; ')}`).join('. ')} className="text-lab-text">
          <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" fillOpacity={0.6} /></marker></defs>
          {trace.edges.map(edge)}
          {laid.map(({ n, lines }) => { const b = box(n.id); const [bg, fg] = TONE[n.tone]; return (
            <g key={n.id}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={8} fill={bg} stroke={fg} strokeWidth={1.5} />
              <text x={b.x + PAD} y={b.y + PAD + 11} fontSize={11.5} fontWeight={700} fill={fg}>{n.title.length > 30 ? `${n.title.slice(0, 29)}…` : n.title}</text>
              {lines.map((l, i) => <text key={i} x={b.x + PAD} y={b.y + PAD + 11 + LINE * (i + 1)} fontSize={11} fill="currentColor">{l}</text>)}
            </g>) })}
        </svg>
      </div>
      {trace.broken.length > 0 ? <div className="rounded border border-lab-amber/60 p-2 text-xs"><p className="font-semibold text-lab-amber">Breaks in the chain</p><ul className="list-disc pl-5">{trace.broken.map((b) => <li key={b}>{b}</li>)}</ul></div> : <p className="text-xs text-lab-cdsco">The chain is complete: a reviewer can follow this value back to its source.</p>}
    </Panel>
  )
}
