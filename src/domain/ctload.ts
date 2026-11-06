// Loading a full CDISC Controlled Terminology file (decision D5). CDISC publishes SDTM CT every
// quarter through NCI EVS as a tab-delimited text file with one row per codelist and one per
// term. Columns: Code, Codelist Code, Codelist Extensible (Yes/No), Codelist Name, CDISC
// Submission Value, CDISC Synonym(s), CDISC Definition, NCI Preferred Term. A codelist row has an
// empty Codelist Code and carries the codelist's short name (e.g. AESEV) as its submission value;
// a term row points to its codelist through Codelist Code. The loaded codelists replace the
// bundled ones of the same name and add the rest, and are kept in this browser (not in the
// project file), so every project uses the same terminology.

import { CT, CT_INFO, BUNDLED_CT_LABEL, type Codelist } from './standards'

export interface CtFile { label: string; loadedUtc: string; codelists: Codelist[] }
const BUNDLED: Record<string, Codelist> = structuredClone(CT)

export function parseCt(text: string, fileName = ''): CtFile {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) throw new Error('The file is empty.')
  const head = lines[0].split('\t').map((h) => h.trim().toLowerCase())
  const col = (name: string) => { const i = head.findIndex((h) => h === name.toLowerCase()); if (i < 0) throw new Error(`This is not an NCI EVS CDISC terminology file: no “${name}” column. Download the SDTM Terminology .txt file from the NCI EVS CDISC page.`); return i }
  const [cCode, cList, cExt, cName, cSub, cSyn, , cPt] = [col('Code'), col('Codelist Code'), col('Codelist Extensible (Yes/No)'), col('Codelist Name'), col('CDISC Submission Value'), col('CDISC Synonym(s)'), 0, col('NCI Preferred Term')]
  const byCode = new Map<string, Codelist>()
  const terms: string[][] = []
  for (const l of lines.slice(1)) {
    const c = l.split('\t').map((x) => x.trim().replace(/^"(.*)"$/, '$1'))
    if (!c[cList]) byCode.set(c[cCode], { id: c[cSub], name: c[cName], extensible: /^yes$/i.test(c[cExt]), terms: [] })
    else terms.push(c)
  }
  for (const c of terms) {
    const list = byCode.get(c[cList]); if (!list) continue
    const syn = (c[cSyn] ?? '').split(';').map((x) => x.trim()).filter(Boolean)
    list.terms.push({ value: c[cSub], decode: syn[0] ?? c[cPt] ?? '' })
  }
  const codelists = [...byCode.values()].filter((x) => x.id && x.terms.length)
  if (!codelists.length) throw new Error('No codelists found in the file.')
  const m = /(\d{4}-\d{2}-\d{2})/.exec(fileName)
  const kind = /adam/i.test(fileName) ? 'ADaM' : /send/i.test(fileName) ? 'SEND' : 'SDTM'
  return { label: `CDISC ${kind} Controlled Terminology${m ? `, ${m[1]} release` : ''} (full file loaded: ${codelists.length} codelists)`, loadedUtc: new Date().toISOString(), codelists }
}

export function applyCt(f: CtFile | null) {
  for (const k of Object.keys(CT)) delete CT[k]
  Object.assign(CT, structuredClone(BUNDLED))
  if (f) for (const c of f.codelists) CT[c.id] = c
  CT_INFO.label = f ? f.label : BUNDLED_CT_LABEL
  CT_INFO.loaded = !!f
}

// ---------- kept in its own IndexedDB ----------
const DB = 'sdtm-trainer-ct'
function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore('ct'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })
}
async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((res, rej) => { const t = db.transaction('ct', mode); const q = fn(t.objectStore('ct')); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); t.oncomplete = () => db.close() })
}
export const saveCt = (f: CtFile | null) => (f ? run('readwrite', (s) => s.put(f, 'loaded')) : run('readwrite', (s) => s.delete('loaded')))
export async function restoreCt() { try { const f = await run<CtFile | undefined>('readonly', (s) => s.get('loaded') as IDBRequest<CtFile | undefined>); if (f) applyCt(f) } catch { /* bundled terminology stays */ } }
