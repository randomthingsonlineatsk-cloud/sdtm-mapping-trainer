// Trial design domains. TA, TE, TV, TI and TS describe the protocol, not subjects, so the
// learner builds them as tables from the protocol facts (Study tab) rather than mapping raw
// rows. SE (subject elements) is then derived from DM and the design. The reference tables
// below are what mission S8 compares against.

import type { Built, OutRow } from './engine'
import { studyDay } from './engine'
import { ARMS, VISITS, CRITERIA, STUDY, SITES } from './study'
import { varsOf, type Version } from './standards'
import { refDm } from './reference'
import { raw } from './seed'

export type DesignRow = Record<string, string>
export const DESIGN_VARS = (d: string, ver: Version) => varsOf(d, ver).map((v) => v.name)

// How a design record is matched to the reference: its natural key.
export function designKey(d: string, r: DesignRow, rank: number): string {
  if (d === 'TA') return `${r.ARMCD}|${Number(r.TAETORD)}`
  if (d === 'TE') return r.ETCD
  if (d === 'TV') return `${Number(r.VISITNUM)}|${r.ARMCD ?? ''}`
  if (d === 'TI') return r.IETESTCD
  return `${r.TSPARMCD}|${rank}`
}
export const DESIGN_SORT: Record<string, string[]> = { TA: ['ARMCD', 'TAETORD'], TE: ['ETCD'], TV: ['VISITNUM'], TI: ['IETESTCD'], TS: ['TSPARMCD', 'TSVAL'] }
export const TEXT_VARS: Record<string, string[]> = { TA: ['TABRANCH'], TE: ['TESTRL', 'TEENRL'], TV: ['TVSTRL', 'TVENRL'], TI: ['IETEST'], TS: ['TSVAL1'] }
export const TS_TEXT_PARAMS = ['TITLE', 'INDIC', 'SPONSOR', 'TRT']

export function designBuilt(d: string, rows: DesignRow[], ver: Version): Built {
  const vars = DESIGN_VARS(d, ver)
  const sorted = [...rows].map((r) => ({ ...r }))
  if (d === 'TS') sorted.sort((a, b) => (a.TSPARMCD ?? '').localeCompare(b.TSPARMCD ?? '') || (a.TSVAL ?? '').localeCompare(b.TSVAL ?? ''))
  const rank = new Map<string, number>()
  const out = sorted.map((r) => {
    const k = r.TSPARMCD ?? ''; const n = (rank.get(k) ?? 0) + 1; rank.set(k, n)
    return { ...Object.fromEntries(vars.map((v) => [v, r[v] ?? ''])), __trace: `${d}:${designKey(d, r, n)}`, __subj: '' } as OutRow
  })
  if (d === 'TS') { const seq = new Map<string, number>(); for (const r of out) { const i = (seq.get(r.TSPARMCD) ?? 0) + 1; seq.set(r.TSPARMCD, i); if (!r.TSSEQ) r.TSSEQ = String(i) } }
  return { domain: d, vars, rows: out, errors: {}, warnings: [] }
}

// ---------- the reference design ----------
const base = (d: string) => ({ STUDYID: STUDY.id, DOMAIN: d })
export function referenceDesign(ver: Version): Record<string, DesignRow[]> {
  const ta: DesignRow[] = ARMS.flatMap((a) => [
    { ...base('TA'), ARMCD: a.code, ARM: a.name, TAETORD: '1', ETCD: 'SCRN', ELEMENT: 'Screening', TABRANCH: `Randomized to ${a.name}`, TATRANS: '', EPOCH: 'SCREENING' },
    { ...base('TA'), ARMCD: a.code, ARM: a.name, TAETORD: '2', ETCD: a.code, ELEMENT: a.name, TABRANCH: '', TATRANS: '', EPOCH: 'TREATMENT' },
    { ...base('TA'), ARMCD: a.code, ARM: a.name, TAETORD: '3', ETCD: 'FU', ELEMENT: 'Follow-up', TABRANCH: '', TATRANS: '', EPOCH: 'FOLLOW-UP' },
  ])
  const te: DesignRow[] = [
    { ...base('TE'), ETCD: 'SCRN', ELEMENT: 'Screening', TESTRL: 'Informed consent signed', TEENRL: 'First dose of study drug, at most 21 days after informed consent', TEDUR: '' },
    ...ARMS.map((a) => ({ ...base('TE'), ETCD: a.code, ELEMENT: a.name, TESTRL: `First dose of ${a.name}`, TEENRL: '26 weeks after the first dose', TEDUR: 'P26W' })),
    { ...base('TE'), ETCD: 'FU', ELEMENT: 'Follow-up', TESTRL: 'Day after the last dose of study drug', TEENRL: '4 weeks after the last dose', TEDUR: 'P4W' },
  ]
  const tv: DesignRow[] = VISITS.map((v) => ({ ...base('TV'), VISITNUM: String(v.num), VISIT: v.name, VISITDY: String(v.day), ARMCD: '', ARM: '', TVSTRL: v.num === 1 ? 'Up to 21 days before the first dose' : v.num === 2 ? 'Day of the first dose' : `Study day ${v.day} (window ${v.lo} to ${v.hi})`, TVENRL: '' }))
  const ti: DesignRow[] = CRITERIA.map((c) => ({ ...base('TI'), IETESTCD: c.code, IETEST: c.text, IECAT: c.cat, IESCAT: '', TIRL: '', TIVERS: '1' }))
  const dm = [...refDm().values()]
  const consent = dm.map((r) => r.RFICDTC).filter(Boolean).sort()[0]
  const last = dm.map((r) => r.RFPENDTC).filter(Boolean).sort().pop()!
  const randomised = raw().forms.IRT.length
  const p = (TSPARMCD: string, TSVAL: string): DesignRow => ({ ...base('TS'), TSSEQ: '', TSGRPID: '', TSPARMCD, TSPARM: '', TSVAL, TSVALNF: '', TSVALCD: '', TSVCDREF: '', TSVCDVER: '' })
  const ts: DesignRow[] = [
    p('TITLE', STUDY.title), p('TPHASE', 'PHASE III TRIAL'), p('STYPE', 'INTERVENTIONAL'), p('TTYPE', 'EFFICACY'), p('TTYPE', 'SAFETY'), p('INDIC', STUDY.indication),
    p('TRT', 'GLV-12'), p('COMPTRT', 'PLACEBO'), p('TBLIND', 'DOUBLE BLIND'), p('TCNTRL', 'PLACEBO'), p('TINDTP', 'TREATMENT'), p('RANDOM', 'Y'), p('ADDON', 'Y'),
    p('NARMS', '3'), p('PLANSUB', String(STUDY.planned)), p('ACTSUB', String(randomised)), p('AGEMIN', 'P18Y'), p('AGEMAX', 'P75Y'), p('SEXPOP', 'BOTH'), p('HLTSUBJI', 'N'),
    p('LENGTH', 'P33W'), ...SITES.map((s) => p('FCNTRY', s.iso)), p('SPONSOR', 'Glyvant Pharmaceuticals'), p('SSTDTC', consent), p('SENDTC', last),
    p('SDTMVER', ver === '3.4' ? '2.0' : '3.0'), p('SDTIGVER', ver === '3.4' ? '3.4' : '4.0'),
  ]
  const decodeParm: Record<string, string> = { TITLE: 'Trial Title', TPHASE: 'Trial Phase Classification', STYPE: 'Study Type', TTYPE: 'Trial Type', INDIC: 'Trial Disease/Condition Indication', TRT: 'Investigational Therapy or Treatment', COMPTRT: 'Comparative Treatment Name', TBLIND: 'Trial Blinding Schema', TCNTRL: 'Control Type', TINDTP: 'Trial Intent Type', RANDOM: 'Trial is Randomized', ADDON: 'Added on to Existing Treatments', NARMS: 'Planned Number of Arms', PLANSUB: 'Planned Number of Subjects', ACTSUB: 'Actual Number of Subjects', AGEMIN: 'Planned Minimum Age of Subjects', AGEMAX: 'Planned Maximum Age of Subjects', SEXPOP: 'Sex of Participants', HLTSUBJI: 'Healthy Subject Indicator', LENGTH: 'Trial Length', FCNTRY: 'Planned Country of Investigational Sites', SPONSOR: 'Clinical Study Sponsor', SSTDTC: 'Study Start Date', SENDTC: 'Study End Date', SDTMVER: 'SDTM Version', SDTIGVER: 'SDTM IG Version' }
  for (const r of ts) r.TSPARM = decodeParm[r.TSPARMCD]
  // Values over 200 characters continue in TSVAL1 (SDTMIG TS assumption), split at a space.
  for (const r of ts) if (r.TSVAL.length > 200) { const cut = r.TSVAL.lastIndexOf(' ', 200); r.TSVAL1 = r.TSVAL.slice(cut + 1); r.TSVAL = r.TSVAL.slice(0, cut) }
  for (const r of ts) r.TSVAL1 ??= ''
  return { TA: ta, TE: te, TV: tv, TI: ti, TS: ts }
}

// SE: each subject's actual path through the elements, derived from the reference DM. An
// element ends when the next one starts; the last ends at the end of participation.
export function deriveSE(): Built {
  const vars = ['STUDYID', 'DOMAIN', 'USUBJID', 'SESEQ', 'ETCD', 'ELEMENT', 'TAETORD', 'EPOCH', 'SESTDTC', 'SEENDTC', 'SESTDY', 'SEENDY']
  const rows: OutRow[] = []
  for (const d of [...refDm().values()].sort((a, b) => a.USUBJID.localeCompare(b.USUBJID))) {
    const arm = ARMS.find((a) => a.code === d.ACTARMCD)
    const els: [string, string, string, string, string, string][] = []
    if (!d.RFXSTDTC) els.push(['SCRN', 'Screening', '1', 'SCREENING', d.RFICDTC, d.RFPENDTC])
    else {
      els.push(['SCRN', 'Screening', '1', 'SCREENING', d.RFICDTC, d.RFXSTDTC])
      els.push([arm!.code, arm!.name, '2', 'TREATMENT', d.RFXSTDTC, d.RFXENDTC])
      if (d.RFPENDTC > d.RFXENDTC) els.push(['FU', 'Follow-up', '3', 'FOLLOW-UP', d.RFXENDTC, d.RFPENDTC])
    }
    els.forEach(([etcd, el, ord, ep, st, en], i) => rows.push({ __trace: `SE:${d.__subj}:${i}`, __subj: d.__subj, STUDYID: STUDY.id, DOMAIN: 'SE', USUBJID: d.USUBJID, SESEQ: String(i + 1), ETCD: etcd, ELEMENT: el, TAETORD: ord, EPOCH: ep, SESTDTC: st, SEENDTC: en, SESTDY: String(studyDay(st, d.RFSTDTC)), SEENDY: String(studyDay(en, d.RFSTDTC)) } as OutRow))
  }
  return { domain: 'SE', vars, rows, errors: {}, warnings: [] }
}
