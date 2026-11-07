// What changed between two data transfers. Raw records are matched by their database record
// ID, so a record entered late, deleted after a query or edited after a query shows as added,
// removed or changed. The SDTM datasets are then compared delivery to delivery with the same
// comparison the QC programmer uses, so every change in the submission data is accounted for.

import type { Row } from './seed'

export interface FieldChange { id: string; subj: string; field: string; from: string; to: string }
export interface FormChanges { form: string; added: Row[]; removed: Row[]; changed: FieldChange[]; fieldsAdded: string[]; fieldsRemoved: string[] }

export function rawChanges(before: Record<string, Row[]>, after: Record<string, Row[]>): FormChanges[] {
  const forms = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()
  return forms.map((form) => {
    const a = before[form] ?? [], b = after[form] ?? []
    const A = new Map(a.map((r) => [r.__id, r])), B = new Map(b.map((r) => [r.__id, r]))
    const fa = new Set(a.flatMap((r) => Object.keys(r))), fb = new Set(b.flatMap((r) => Object.keys(r)))
    const changed: FieldChange[] = []
    for (const [id, r] of B) {
      const o = A.get(id); if (!o) continue
      for (const k of new Set([...Object.keys(o), ...Object.keys(r)])) if (k !== '__id' && (o[k] ?? '') !== (r[k] ?? '')) changed.push({ id, subj: r.SUBJID ?? '', field: k, from: o[k] ?? '', to: r[k] ?? '' })
    }
    return {
      form, added: b.filter((r) => !A.has(r.__id)), removed: a.filter((r) => !B.has(r.__id)), changed,
      fieldsAdded: [...fb].filter((k) => !fa.has(k)), fieldsRemoved: [...fa].filter((k) => !fb.has(k)),
    }
  }).filter((f) => f.added.length || f.removed.length || f.changed.length || f.fieldsAdded.length || f.fieldsRemoved.length)
}

// Field changes grouped by field, for a short summary per form.
export function byField(changes: FieldChange[]): { field: string; count: number; examples: FieldChange[] }[] {
  const m = new Map<string, FieldChange[]>()
  for (const c of changes) (m.get(c.field) ?? m.set(c.field, []).get(c.field)!).push(c)
  return [...m].map(([field, xs]) => ({ field, count: xs.length, examples: xs.slice(0, 5) })).sort((a, b) => b.count - a.count)
}
