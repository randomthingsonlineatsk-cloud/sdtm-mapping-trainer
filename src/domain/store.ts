// IndexedDB persistence and project files. Everything stays in this browser unless the user
// exports a file.

import type { Project } from './project'
import { migrate } from './project'
import { hash } from './util'

const DB = 'sdtm-mapping-trainer', STORE = 'projects', VERSION = 1

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, VERSION)
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'id' }) }
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}
const tx = async <T,>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await open()
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode)
    const req = fn(t.objectStore(STORE))
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
    t.oncomplete = () => db.close()
  })
}
export const saveProject = (p: Project) => tx('readwrite', (s) => s.put(p))
export const listProjects = () => tx<Project[]>('readonly', (s) => s.getAll() as IDBRequest<Project[]>)
export const deleteProject = (id: string) => tx('readwrite', (s) => s.delete(id))

export const PROJECT_FORMAT = 'sdtm-trainer-project'
export interface ProjectFile { format: typeof PROJECT_FORMAT; version: 1; exportedUtc: string; checksum: string; project: Project }
export function exportFile(p: Project): string {
  const body = JSON.stringify(p)
  const f: ProjectFile = { format: PROJECT_FORMAT, version: 1, exportedUtc: new Date().toISOString(), checksum: hash(body), project: p }
  return JSON.stringify(f)
}
export function importFile(text: string): { project: Project; warnings: string[] } {
  let f: ProjectFile
  try { f = JSON.parse(text) } catch { throw new Error('This file is not valid JSON.') }
  if (f?.format !== PROJECT_FORMAT || !f.project) throw new Error('This is not an SDTM Mapping Trainer project file. (A CDM Query & Edit-Check Console project goes in through “Import a CDM Console study”.)')
  if (f.project.schema !== 1) throw new Error(`Unsupported project schema ${String(f.project.schema)}.`)
  const warnings: string[] = []
  if (hash(JSON.stringify(f.project)) !== f.checksum) warnings.push('The file checksum does not match: the file was changed after export.')
  return { project: migrate(f.project), warnings }
}
export function download(name: string, text: string, type = 'application/json') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
