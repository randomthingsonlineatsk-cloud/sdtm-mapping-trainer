// The Study Data Standardization Plan (SDSP): the program-level document FDA asks sponsors to
// keep with their IND and update as studies are added, saying which studies there are and which
// standards, terminology and dictionary versions each uses, so standards questions are settled
// with the review division early. Laid out after the PHUSE SDSP template, built here from the
// learner's projects in this browser (one per study), and written with the guide PDF writer.

import { VERSION_LABEL, CT_INFO } from './standards'
import { SDD_VERSION } from './dictdrug'
import { PACKS } from './studies'
import { STUDY } from './study'
import type { Project } from './project'
import type { Csdrg, CsdrgSection } from './csdrg'

export function buildSdsp(projects: Project[], userId: string, sponsorNote = ''): Csdrg {
  const mine = projects.filter((p) => p.userId === userId && !p.imported)
  const byStudy = new Map<string, Project>()
  for (const p of mine.sort((a, b) => b.updatedUtc.localeCompare(a.updatedUtc))) if (!byStudy.has(p.study)) byStudy.set(p.study, p)
  const studies = [...byStudy.values()].sort((a, b) => a.study.localeCompare(b.study))
  const info = (p: Project) => PACKS[p.study] ?? { id: STUDY.id, title: STUDY.title, phase: STUDY.phase, indication: STUDY.indication, standard: undefined }
  const S: CsdrgSection[] = []
  const sec = (num: string, title: string, paras: string[] = [], table?: CsdrgSection['table']) => S.push({ num, title, level: num.split('.').length as 1 | 2 | 3, paras: paras.filter(Boolean), table })
  sec('1', 'Introduction')
  sec('1.1', 'Purpose', ['This plan lists the studies of the program and the data standards, terminology and dictionaries each uses or will use, so that questions about standards can be agreed with the review division before data are submitted. It is updated as studies are added or plans change.', sponsorNote])
  sec('1.2', 'Regulatory Basis', ['FDA guidance on providing regulatory submissions in electronic format (standardized study data) and the FDA Data Standards Catalog say which standards and versions are supported and required, by study start date; the Study Data Technical Conformance Guide gives the technical detail. Nonclinical studies use SEND, clinical studies SDTM, with define.xml and a reviewer’s guide for each.'])
  sec('2', 'Planned and Ongoing Studies')
  sec('2.1', 'Studies', [], { head: ['Study', 'Phase or type', 'Indication', 'Data standard', 'eCTD module'], widths: [0.17, 0.2, 0.25, 0.25, 0.13], rows: studies.map((p) => { const i = info(p); return [p.study, i.phase, i.indication, VERSION_LABEL[p.version], i.standard === 'send' ? 'm4' : 'm5'] }) })
  sec('3', 'Standards, Terminology and Dictionaries')
  sec('3.1', 'Versions by Study', [], { head: ['Study', 'Implementation guide', 'Controlled terminology', 'Define-XML', 'Dictionaries'], widths: [0.16, 0.26, 0.26, 0.1, 0.22], rows: studies.map((p) => [p.study, VERSION_LABEL[p.version], CT_INFO.label, '2.1', p.study === STUDY.id ? `Study Medical Dictionary (fictional, MedDRA-like) 1.1; Study Drug Dictionary (fictional, WHODrug-like) ${SDD_VERSION}` : 'None coded in the training data']) })
  const draft = studies.filter((p) => p.version === '4.0d')
  sec('3.2', 'Exceptions and Planned Changes', [draft.length ? `${draft.map((p) => p.study).join(', ')} ${draft.length === 1 ? 'is' : 'are'} mapped to the SDTMIG v4.0 public-review draft for training only; a submission would use SDTMIG v3.4 until FDA supports v4.0.` : 'No study departs from the standards FDA currently supports.', 'Sponsor-defined test codes used where CDISC terminology has none (for example adjudication results and diary items) are listed in each study’s define.xml and explained in its reviewer’s guide.'])
  sec('4', 'Data Conformance and Submission')
  sec('4.1', 'Conformance', [`Each study is validated before submission under the rule set of the agency it goes to; the last runs in this program: ${studies.map((p) => { const r = (p.validation ?? []).at(-1); return `${p.study} ${r ? `${r.utc.slice(0, 10)} (${r.ruleSet}: ${r.reject} Reject, ${r.error} Error, ${r.warning} Warning)` : 'not yet validated'}` }).join('; ')}. Issues that remain are explained in the study’s reviewer’s guide.`])
  sec('4.2', 'Technical Rejection Criteria', ['Every study’s package includes ts.xpt with the study start date (SSTDTC for SDTM, STSTDTC for SEND), dm.xpt and define.xml, in the folder of its module: m5/datasets/<study>/tabulations/sdtm/ or m4/datasets/<study>/tabulations/send/.'])
  sec('4.3', 'Data Exchange Format', ['Datasets are submitted as SAS version 5 transport files (XPT), as FDA requires. CDISC Dataset-JSON v1.1 is produced alongside for internal hand-off; FDA has been testing it as a successor to XPT and has not set a date for accepting it.'])
  return { sections: S, findings: studies.length ? [] : [{ rule: 'SDSP-001', sev: 'Warning', where: '2.1', msg: 'No projects yet' }] }
}
