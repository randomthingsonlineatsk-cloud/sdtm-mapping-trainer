import { RULES, severityIn, type RuleSet } from '../domain/conformance'
import { FIX } from '../domain/ruleHelp'
import { Btn } from './ui'

// What a rule checks, why it matters, and how to fix the mapping.
export function RuleHelp({ id, onClose }: { id: string; onClose: () => void }) {
  const r = RULES.find((x) => x.id === id), f = FIX[id]
  if (!r) return null
  return (
    <div role="region" aria-label={`About ${id}`} className="rounded border border-lab-cdsco/40 bg-lab-panel-strong p-3 text-xs space-y-1.5">
      <div className="flex items-start justify-between gap-2"><p className="text-sm"><b className="font-mono">{id}</b> · {r.text}</p><Btn tone="grey" className="py-0.5" onClick={onClose}>Close</Btn></div>
      {f && <><p><b>Why it matters.</b> {f.why}</p><p><b>How to fix it.</b> {f.fix}</p></>}
      <p className="text-lab-text-muted">Basis: {r.basis}. Severity: {(['CDISC', 'FDA', 'PMDA'] as RuleSet[]).map((s) => `${s} ${severityIn(id, s) ?? 'not checked'}`).join(' · ')}.</p>
      <p className="text-lab-text-muted">If the data are right as they are (the raw data really say so), the finding is explained in the reviewer’s guide instead of fixed.</p>
    </div>
  )
}
