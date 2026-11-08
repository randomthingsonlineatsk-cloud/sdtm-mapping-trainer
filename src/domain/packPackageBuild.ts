// Writing a specialist study's package files and zip (loaded on demand: it brings in the PDF writer).
import { zipSync, strToU8 } from 'fflate'
import { toXpt } from './exports'
import { toDefineXml, STYLESHEET } from './define'
import { DEFINE_XSL } from './defineXsl'
import { csdrgPdf } from './csdrgPdf'
import { buildPackGuide, guideName, guideTitle, packFolder, type PackPlan } from './packPackage'
import type { PkgFile } from './package'
import type { Project } from './project'

export function packPackageFiles(p: Project, plan: PackPlan, now = new Date()): PkgFile[] {
  const files: PkgFile[] = []
  for (const [name, b] of [...plan.all].sort(([a], [c]) => a.localeCompare(c))) files.push({ name: `${name.toLowerCase()}.xpt`, bytes: toXpt(b, p.version, now).bytes, what: `${name} dataset (SAS V5 transport)${name === 'TS' && plan.tsBuiltByTrainer ? ', built from the protocol by the trainer' : ''}` })
  files.push({ name: 'define.xml', bytes: strToU8(toDefineXml(plan.define)), what: 'Define-XML 2.1' })
  files.push({ name: STYLESHEET, bytes: strToU8(DEFINE_XSL), what: 'Stylesheet for define.xml' })
  const g = buildPackGuide(p, plan, (p.validation ?? []).at(-1))
  files.push({ name: guideName(plan.pack), bytes: csdrgPdf(plan.pack.id, g, { author: p.csdrg?.author ?? '', date: now.toISOString().slice(0, 10), title: plan.pack.title, doc: guideTitle(plan.pack) }), what: guideTitle(plan.pack) })
  return files
}
export function zipPackPackage(plan: PackPlan, files: PkgFile[], now = new Date()): Uint8Array {
  const dir = packFolder(plan.pack)
  return zipSync(Object.fromEntries(files.map((f) => [dir + f.name, [f.bytes, { level: f.name.endsWith('.pdf') ? 0 : 6, mtime: now }]])))
}
