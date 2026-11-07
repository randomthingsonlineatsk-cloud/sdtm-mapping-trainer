import { useStore } from '../state'
import { TRANSFERS, type Transfer } from '../domain/seed'
import { log, isGlv } from '../domain/project'
import { Btn } from './ui'

// Which data transfer the project works on. Switching keeps every mapping: re-running them on
// the new transfer is the point.
export function TransferSwitch() {
  const { p, act } = useStore()
  if (!isGlv(p)) return null
  const t = p.transfer ?? 1
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Data transfer">
        {([1, 2] as Transfer[]).map((x) => <Btn key={x} tone={t === x ? 'solid' : 'grey'} className="py-0.5" aria-pressed={t === x} onClick={() => act((pp) => { pp.transfer = x; log(pp, `Switched to ${TRANSFERS[x].label}`) })}>{TRANSFERS[x].label} · {TRANSFERS[x].date}</Btn>)}
      </div>
      <p className="text-[11px] text-lab-text-muted">{TRANSFERS[t].note}</p>
    </div>
  )
}
