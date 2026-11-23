// Adverse events for ONK-44-302, as the sites record them on the eCRF and the coder codes them with
// the Study Medical Dictionary (version 1.0). Grades follow a CTCAE-style 1 to 5 scale. Drawn on a
// random stream of their own, so every other ONK-44-302 record is unchanged.
//
// Each arm has its own toxicity profile: docetaxel brings neutropenia (with febrile neutropenia as
// the usual serious event), fatigue, hair loss and neuropathy; ONK-44 brings diarrhoea, rash,
// decreased appetite, raised liver enzymes and, rarely, pneumonitis. Background events (cough,
// breathlessness, constipation, back pain, fever, pneumonia) occur in both. The four deaths from
// causes other than disease progression have a fatal adverse event (grade 5). Events are collected
// from the first dose to 30 days after the last dose, or to the data cut-off; fatal events after
// that are still collected, as serious adverse events are.

import { rng, addDays } from './util'
import { toEdc, anyDate } from './rawdate'
import { SMD_10, exactLlt, path } from './dictmed'

type Raw = Record<string, string>
interface Profile { pt: string; verbatims: string[]; p: number; grades: number[]; related: boolean; dur: [number, number]; serious?: (g: number, r: () => number) => boolean; long?: boolean }
const G_MILD = [0.55, 0.35, 0.1, 0, 0]
const PROFILES: Record<string, Profile[]> = {
  DOCE: [
    { pt: 'Neutropenia', verbatims: ['Neutropenia', 'Neutrophil count decreased', 'Low neutrophils'], p: 0.35, grades: [0, 0.1, 0.35, 0.55, 0], related: true, dur: [5, 10] },
    { pt: 'Febrile neutropenia', verbatims: ['Febrile neutropenia', 'Neutropenic fever'], p: 0.14, grades: [0, 0, 1, 0, 0], related: true, dur: [4, 9], serious: () => true },
    { pt: 'Fatigue', verbatims: ['Fatigue', 'Feeling tired', 'Lethargy'], p: 0.4, grades: [0.5, 0.4, 0.1, 0, 0], related: true, dur: [10, 40] },
    { pt: 'Hair loss', verbatims: ['Alopecia', 'Hair loss'], p: 0.35, grades: [0.6, 0.4, 0, 0, 0], related: true, dur: [60, 160], long: true },
    { pt: 'Diarrhoea', verbatims: ['Diarrhoea', 'Loose stools'], p: 0.2, grades: G_MILD, related: true, dur: [3, 8] },
    { pt: 'Nausea', verbatims: ['Nausea', 'Feeling sick'], p: 0.3, grades: G_MILD, related: true, dur: [2, 7] },
    { pt: 'Stomatitis', verbatims: ['Stomatitis', 'Mouth ulcers', 'Oral mucositis'], p: 0.15, grades: G_MILD, related: true, dur: [5, 12] },
    { pt: 'Peripheral neuropathy', verbatims: ['Peripheral neuropathy', 'Peripheral sensory neuropathy'], p: 0.18, grades: [0.6, 0.35, 0.05, 0, 0], related: true, dur: [40, 120], long: true },
    { pt: 'Anaemia', verbatims: ['Anaemia', 'Low haemoglobin'], p: 0.22, grades: [0.4, 0.45, 0.15, 0, 0], related: true, dur: [14, 40] },
    { pt: 'Decreased appetite', verbatims: ['Decreased appetite', 'Loss of appetite'], p: 0.15, grades: G_MILD, related: true, dur: [7, 30] },
  ],
  ONK44: [
    { pt: 'Diarrhoea', verbatims: ['Diarrhoea', 'Loose stools', 'Diarrhea'], p: 0.5, grades: [0.45, 0.4, 0.15, 0, 0], related: true, dur: [4, 21], serious: (g, r) => g >= 3 && r() < 0.5 },
    { pt: 'Rash', verbatims: ['Rash', 'Skin rash', 'Itchy rash'], p: 0.45, grades: [0.5, 0.4, 0.1, 0, 0], related: true, dur: [10, 45] },
    { pt: 'Fatigue', verbatims: ['Fatigue', 'Feeling tired'], p: 0.3, grades: [0.6, 0.35, 0.05, 0, 0], related: true, dur: [10, 40] },
    { pt: 'Decreased appetite', verbatims: ['Decreased appetite', 'Loss of appetite', 'Appetite lost'], p: 0.28, grades: G_MILD, related: true, dur: [7, 30] },
    { pt: 'Nausea', verbatims: ['Nausea', 'Nauseous'], p: 0.25, grades: G_MILD, related: true, dur: [3, 14] },
    { pt: 'Stomatitis', verbatims: ['Stomatitis', 'Sore mouth'], p: 0.22, grades: G_MILD, related: true, dur: [5, 20] },
    { pt: 'Liver enzymes raised', verbatims: ['ALT increased', 'Transaminases increased'], p: 0.15, grades: [0.4, 0.35, 0.25, 0, 0], related: true, dur: [14, 35] },
    { pt: 'Pneumonitis', verbatims: ['Pneumonitis', 'Interstitial lung disease'], p: 0.07, grades: [0, 0.4, 0.6, 0, 0], related: true, dur: [14, 40], serious: (g) => g >= 3 },
  ],
  ALL: [
    { pt: 'Cough', verbatims: ['Cough', 'Dry cough', 'Productive cough'], p: 0.15, grades: [0.7, 0.3, 0, 0, 0], related: false, dur: [7, 30] },
    { pt: 'Breathlessness', verbatims: ['Dyspnoea', 'Shortness of breath'], p: 0.12, grades: [0.5, 0.4, 0.1, 0, 0], related: false, dur: [7, 30] },
    { pt: 'Constipation', verbatims: ['Constipation', 'Constipated'], p: 0.15, grades: [0.7, 0.3, 0, 0, 0], related: false, dur: [3, 10] },
    { pt: 'Back pain', verbatims: ['Back pain', 'Lower back pain'], p: 0.1, grades: [0.6, 0.4, 0, 0, 0], related: false, dur: [5, 20] },
    { pt: 'Fever', verbatims: ['Fever', 'Pyrexia'], p: 0.08, grades: [0.7, 0.3, 0, 0, 0], related: false, dur: [2, 5] },
    { pt: 'Pneumonia', verbatims: ['Pneumonia', 'Chest infection with consolidation'], p: 0.05, grades: [0, 0, 1, 0, 0], related: false, dur: [7, 14], serious: () => true },
  ],
}

export const ONK_AE_FIELDS = ['AESPID', 'AETERM', 'AELLT', 'AELLTCD', 'AEDECOD', 'AEPTCD', 'AEHLT', 'AEHLTCD', 'AEHLGT', 'AEHLGTCD', 'AESOC', 'AESOCCD', 'AESTDAT', 'AEENDAT', 'AEONGO', 'AETOXGR', 'AESER', 'AESDTH', 'AESLIFE', 'AESHOSP', 'AESDISAB', 'AESCONG', 'AESMIE', 'AEREL', 'AEACN', 'AEOUT'] as const

/** The coded dictionary path of a verbatim that is a current lowest-level term. */
export function onkCoding(verbatim: string): Raw {
  const llt = exactLlt(SMD_10, verbatim)
  if (!llt) throw new Error(`“${verbatim}” is not a lowest-level term of the Study Medical Dictionary 1.0`)
  const [soc, hlgt, hlt, pt] = path(SMD_10, llt.code)
  return { AELLT: llt.name, AELLTCD: llt.code, AEDECOD: pt.name, AEPTCD: pt.code, AEHLT: hlt.name, AEHLTCD: hlt.code, AEHLGT: hlgt.name, AEHLGTCD: hlgt.code, AESOC: soc.name, AESOCCD: soc.code }
}

/** One row per adverse event, in each participant's order of onset (AESPID 1, 2 …). */
export function onkAdverseEvents(forms: Record<string, Raw[]>, subjects: { subj: string; arm?: string }[], cut: string, seed = 44302 + 7927): Raw[] {
  const r = rng(seed)
  const pick = <T,>(xs: T[]) => xs[Math.floor(r.next() * xs.length)]
  const int = (lo: number, hi: number) => lo + Math.floor(r.next() * (hi - lo + 1))
  const grade = (w: number[]) => { let x = r.next(); for (let i = 0; i < w.length; i++) { x -= w[i]; if (x < 0) return i + 1 } return 1 }
  const iso = (s: string) => anyDate(s) ?? ''
  const out: Raw[] = []
  for (const s of subjects) {
    if (!s.arm) continue
    const ex = (forms.EX ?? []).filter((x) => x.SUBJID === s.subj)
    if (!ex.length) continue
    const first = ex.map((x) => iso(x.EXSTDAT)).sort()[0], last = ex.map((x) => iso(x.EXENDAT)).sort().at(-1)!
    const dth = (forms.DTH ?? []).find((x) => x.SUBJID === s.subj)
    const death = dth && /^\d{2}-/.test(dth.DTHDAT) ? iso(dth.DTHDAT) : ''
    const end = [addDays(last, 30), cut, ...(death ? [addDays(death, -1)] : [])].sort()[0]
    const span = Math.round((Date.parse(end) - Date.parse(first)) / 86400000)
    const events: Raw[] = []
    for (const pr of [...PROFILES[s.arm], ...PROFILES.ALL]) {
      if (r.next() >= pr.p || span < 2) continue
      const g = grade(pr.grades)
      const onset = addDays(first, int(1, Math.min(span, 150)))
      const stop = addDays(onset, pr.long ? int(pr.dur[0], pr.dur[1]) : int(pr.dur[0], pr.dur[1]))
      const ongoing = stop > cut || (!!death && stop >= death)
      const serious = !!pr.serious?.(g, () => r.next())
      const acn = !pr.related ? 'DOSE NOT CHANGED' : g >= 3 ? (s.arm === 'DOCE' ? 'DRUG INTERRUPTED' : (void pick([0, 1]), 'DRUG INTERRUPTED')) : 'DOSE NOT CHANGED' // the draw is kept so the records stay the same
      events.push({
        AETERM: pick(pr.verbatims), AESTDAT: onset, AEENDAT: ongoing ? '' : stop, AEONGO: ongoing ? 'Y' : 'N', AETOXGR: String(g),
        AESER: serious ? 'Y' : 'N', AESDTH: serious ? 'N' : '', AESLIFE: serious ? 'N' : '', AESHOSP: serious ? 'Y' : '', AESDISAB: serious ? 'N' : '', AESCONG: serious ? 'N' : '', AESMIE: serious ? 'N' : '',
        AEREL: pr.related ? 'RELATED' : 'NOT RELATED', AEACN: onset > last ? 'NOT APPLICABLE' : acn,
        AEOUT: ongoing ? (stop > addDays(cut, 14) || death ? 'NOT RECOVERED/NOT RESOLVED' : 'RECOVERING/RESOLVING') : 'RECOVERED/RESOLVED',
      })
    }
    // A fatal adverse event for a death not caused by disease progression.
    if (death && dth!.DTHCAUSE !== 'Disease progression') {
      const onset = addDays(death, -int(4, 12))
      events.push({ AETERM: dth!.DTHCAUSE, AESTDAT: onset, AEENDAT: death, AEONGO: 'N', AETOXGR: '5', AESER: 'Y', AESDTH: 'Y', AESLIFE: 'N', AESHOSP: 'Y', AESDISAB: 'N', AESCONG: 'N', AESMIE: 'N', AEREL: 'NOT RELATED', AEACN: onset > last ? 'NOT APPLICABLE' : 'DRUG WITHDRAWN', AEOUT: 'FATAL' })
    }
    events.sort((a, b) => a.AESTDAT.localeCompare(b.AESTDAT) || a.AETERM.localeCompare(b.AETERM))
    events.forEach((e, i) => out.push({ SUBJID: s.subj, AESPID: String(i + 1), AETERM: e.AETERM, ...onkCoding(e.AETERM), AESTDAT: toEdc(e.AESTDAT), AEENDAT: toEdc(e.AEENDAT), AEONGO: e.AEONGO, AETOXGR: e.AETOXGR, AESER: e.AESER, AESDTH: e.AESDTH, AESLIFE: e.AESLIFE, AESHOSP: e.AESHOSP, AESDISAB: e.AESDISAB, AESCONG: e.AESCONG, AESMIE: e.AESMIE, AEREL: e.AEREL, AEACN: e.AEACN, AEOUT: e.AEOUT }))
  }
  return out
}

/**
 * Make the dosing record show each interruption the adverse event pages record, so the two agree.
 * ONK-44: the daily doses are held from the day after onset for 5 to 10 days, splitting that
 * cycle's record in two (or ending it early when the hold runs to the end of the cycle). Docetaxel:
 * the next infusion is delayed by 7 days and the later ones move with it; an infusion pushed past
 * the original last infusion is not given (one delay per infusion, however many events), and an event whose delayed infusion is never given led
 * to the drug being stopped. Events that start after the (new) last dose take “Not applicable”.
 * Uses a random stream of its own.
 */
export function applyInterruptions(forms: Record<string, Raw[]>, subjects: { subj: string; arm?: string }[], aes: Raw[], seed = 44302 + 7937): void {
  const r = rng(seed)
  const iso = (s: string) => anyDate(s) ?? ''
  const withdrawn = new Set<Raw>(), delayed = new Set<Raw>()
  for (const s of subjects) {
    if (!s.arm) continue
    const ex = () => (forms.EX ?? []).filter((x) => x.SUBJID === s.subj)
    if (!ex().length) continue
    const origLast = ex().map((x) => iso(x.EXSTDAT)).sort().at(-1)!
    for (const a of aes.filter((x) => x.SUBJID === s.subj && x.AEACN === 'DRUG INTERRUPTED')) {
      const onset = iso(a.AESTDAT)
      if (s.arm === 'ONK44') {
        const hold = 5 + Math.floor(r.next() * 6)
        const row = ex().find((x) => iso(x.EXSTDAT) <= onset && onset <= iso(x.EXENDAT))
        if (!row) continue
        const en = iso(row.EXENDAT), back = addDays(onset, hold + 1)
        row.EXENDAT = toEdc(onset)
        if (back <= en) forms.EX.splice(forms.EX.indexOf(row) + 1, 0, { __id: `${row.__id}b`, SUBJID: s.subj, CYCLE: row.CYCLE, EXSTDAT: toEdc(back), EXENDAT: toEdc(en) })
      } else {
        const later = ex().filter((x) => iso(x.EXSTDAT) > onset)
        if (!later.length || delayed.has(later[0])) continue // already delayed for an earlier event
        delayed.add(later[0])
        for (const x of later) {
          const d = addDays(iso(x.EXSTDAT), 7)
          if (d > origLast) forms.EX.splice(forms.EX.indexOf(x), 1)
          else { x.EXSTDAT = toEdc(d); x.EXENDAT = toEdc(d) }
        }
        if (!ex().some((x) => iso(x.EXSTDAT) > onset)) { a.AEACN = 'DRUG WITHDRAWN'; withdrawn.add(a) }
      }
    }
    const last = ex().map((x) => iso(x.EXENDAT)).sort().at(-1)!
    for (const a of aes.filter((x) => x.SUBJID === s.subj && !withdrawn.has(x) && x.AEACN !== 'NOT APPLICABLE' && iso(x.AESTDAT) > last)) a.AEACN = 'NOT APPLICABLE'
  }
}
