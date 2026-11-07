// Writing the package files and the zip (loaded on demand: it brings in the PDF writer).

import { zipSync, strToU8 } from 'fflate'
import type { StudyData } from './engine'
import { toXpt } from './exports'
import { buildDefine, toDefineXml, STYLESHEET } from './define'
import { DEFINE_XSL } from './defineXsl'
import { crfPages, layoutAcrf } from './acrf'
import { acrfPdf } from './acrfPdf'
import { buildCsdrg } from './csdrg'
import { csdrgPdf } from './csdrgPdf'
import { TRIAL_DESIGN } from './standards'
import { STUDY } from './study'
import { sdtmFolder, type PackagePlan, type PkgFile } from './package'
import type { Project } from './project'

export function packageFiles(p: Project, data: StudyData, plan: PackagePlan, now = new Date()): PkgFile[] {
  const files: PkgFile[] = []
  for (const [name, b] of [...plan.all].sort(([a], [c]) => a.localeCompare(c))) files.push({ name: `${name.toLowerCase()}.xpt`, bytes: toXpt(b, p.version, now).bytes, what: `${name} dataset (SAS V5 transport)` })
  const pages = crfPages(data.forms)
  const model = buildDefine({ builts: plan.all, specs: p.specs, version: p.version, laid: layoutAcrf(pages, p.acrf ?? {}), designDomains: TRIAL_DESIGN }, now)
  files.push({ name: 'define.xml', bytes: strToU8(toDefineXml(model)), what: 'Define-XML 2.1' })
  files.push({ name: STYLESHEET, bytes: strToU8(DEFINE_XSL), what: 'Stylesheet for define.xml' })
  files.push({ name: 'acrf.pdf', bytes: acrfPdf(STUDY.id, pages, p.acrf ?? {}, p.specs), what: 'Annotated CRF' })
  const g = buildCsdrg(p, data, plan.all, plan.issues, (p.validation ?? []).at(-1))
  files.push({ name: 'csdrg.pdf', bytes: csdrgPdf(STUDY.id, g, { author: p.csdrg?.author ?? '', date: now.toISOString().slice(0, 10), title: STUDY.title }), what: 'Reviewer’s guide' })
  return files
}

export function zipPackage(study: string, files: PkgFile[], now = new Date()): Uint8Array {
  const dir = sdtmFolder(study)
  return zipSync(Object.fromEntries(files.map((f) => [dir + f.name, [f.bytes, { level: f.name.endsWith('.pdf') ? 0 : 6, mtime: now }]])))
}
