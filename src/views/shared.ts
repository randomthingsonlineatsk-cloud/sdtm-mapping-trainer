import { useMemo } from 'react'
import { useStore } from '../state'
import { dataFor, packOf, type Project } from '../domain/project'
import { RAW_FIELDS, FORM_INFO } from '../domain/seed'

export function useData() {
  const { p, tick } = useStore()
  return useMemo(() => dataFor(p), [p, tick])
}
export const formInfoOf = (p: Project): Record<string, { name: string; source: string; note: string }> => packOf(p)?.formInfo ?? FORM_INFO
export const formsOf = (p: Project): string[] => (p.imported ? Object.keys(p.imported.forms).sort() : Object.keys(formInfoOf(p)))
export const formName = (p: Project, f: string) => (p.imported ? f : formInfoOf(p)[f]?.name ?? f)
export function fieldsOf(p: Project, form: string): { name: string; label: string }[] {
  if (!p.imported) return (packOf(p)?.rawFields ?? RAW_FIELDS)[form] ?? []
  const rows = p.imported.forms[form] ?? []
  const names = new Set<string>(); for (const r of rows.slice(0, 200)) for (const k of Object.keys(r)) if (k !== '__id') names.add(k)
  return [...names].map((name) => ({ name, label: '' }))
}
// A few distinct example values of a raw field, to help write rules.
export function samples(rows: Record<string, string>[], field: string, n = 4): string[] {
  const out: string[] = []
  for (const r of rows) { const x = r[field]; if (x && !out.includes(x)) { out.push(x); if (out.length >= n) break } }
  return out
}
export const distinct = (rows: Record<string, string>[], field: string) => [...new Set(rows.map((r) => r[field] ?? '').filter((x) => x !== ''))].sort()
