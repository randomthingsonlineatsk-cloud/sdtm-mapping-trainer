// ONK-44-302 from the CDM Query & Edit-Check Console. The console's sites enter the study's source
// records into the eCRF; once its database is cleaned and locked, its forms are these records again.
// This turns the console's forms (one row per form instance, CDASH field names, ISO dates) back into
// the raw datasets mapped here (EDC dates as DD-MMM-YYYY, partial dates as UN-MMM-YYYY, visits by
// name). The randomisation list (IRT) and the independent review file are vendor data, not in the
// EDC, so they come with the study as before. Deviation pages (DV) are not in this study's raw data.

import type { Row } from './seed'
import { onkRaw } from './onc'
import { toEdc } from './rawdate'

const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
// ISO (or a partial YYYY-MM) to the EDC export format.
const edc = (s: string) => (!s ? '' : /^\d{4}-\d{2}$/.test(s) ? `UN-${MON[Number(s.slice(5)) - 1]}-${s.slice(0, 4)}` : toEdc(s))
const visitName = (v: string) => (v === 'SCR' ? 'Screening' : /^W\d+$/.test(v) ? `Week ${v.slice(1)}` : v)
const visitOrder = (v: string) => (v === 'SCR' ? 0 : v === 'D1' ? 1 : /^W(\d+)$/.test(v) ? 1 + Number(v.slice(1)) : 999)
const num = (subj: string) => Number(subj.split('-')[1])

export const ONK_EDC_FORMS = ['DM', 'IC', 'EX', 'LC', 'PRP', 'TUI', 'TRM', 'RSP', 'DTH'] as const

export function onkFromCdm(c: Record<string, Row[]>): Record<string, Row[]> {
  const sorted = (form: string) => [...(c[form] ?? [])].sort((a, b) => num(a.SUBJID) - num(b.SUBJID) || visitOrder(a.VISIT ?? '') - visitOrder(b.VISIT ?? '') || Number(a.INSTANCE) - Number(b.INSTANCE))
  const scr = new Map((c.SV ?? []).filter((r) => r.VISIT === 'SCR').map((r) => [r.SUBJID, r.VISDAT]))
  const site = (s: string) => s.split('-')[0]
  let n = 0
  const row = (form: string, r: Record<string, string>): Row => ({ __id: `${form}${++n}`, ...r } as Row)
  const raw = onkRaw().forms
  return {
    DM: sorted('DM').map((r) => row('DM', { SUBJID: r.SUBJID, SITEID: site(r.SUBJID), DMDAT: edc(scr.get(r.SUBJID) ?? ''), BRTHDAT: edc(r.BRTHDAT), SEX: r.SEX, RACE: r.RACE, ETHNIC: r.ETHNIC })),
    IC: sorted('IC').map((r) => row('IC', { SUBJID: r.SUBJID, ICDAT: edc(r.DSSTDAT) })),
    IRT: raw.IRT,
    EX: sorted('EX').map((r) => row('EX', { SUBJID: r.SUBJID, CYCLE: r.CYCLE, EXSTDAT: edc(r.EXSTDAT), EXENDAT: edc(r.EXENDAT) })),
    LC: sorted('LC').map((r) => row('LC', { SUBJID: r.SUBJID, LCDAT: edc(r.LCDAT) })),
    PRP: sorted('PRP').map((r) => row('PRP', { SUBJID: r.SUBJID, PRSPID: r.INSTANCE, PROC: r.PROC, PRCAT: r.PRCAT, LOC: r.LOC, LAT: r.LAT, STDAT: edc(r.STDAT), ENDAT: edc(r.ENDAT), DOSE: r.DOSE, DOSEU: r.DOSEU })),
    TUI: sorted('TUI').map((r) => row('TUI', { SUBJID: r.SUBJID, VISIT: visitName(r.VISIT), ASSDAT: edc(r.ASSDAT), LESID: r.LESID, LESTYPE: r.LESTYPE, LOC: r.LOC, LAT: r.LAT, NODAL: r.NODAL, METHOD: r.METHOD })),
    TRM: sorted('TRM').map((r) => row('TRM', { SUBJID: r.SUBJID, VISIT: visitName(r.VISIT), ASSDAT: edc(r.ASSDAT), LESID: r.LESID, DIAM: r.DIAM, TSTM: r.TSTM, LESSTAT: r.LESSTAT, NOTDONE: r.NOTDONE })),
    RSP: sorted('RSP').map((r) => row('RSP', { SUBJID: r.SUBJID, VISIT: visitName(r.VISIT), ASSDAT: edc(r.ASSDAT), SUMDIAM: r.SUMDIAM, TRGRESP: r.TRGRESP, NTRGRESP: r.NTRGRESP, NEWLES: r.NEWLES, OVRLRESP: r.OVRLRESP })),
    IRC: raw.IRC,
    DTH: sorted('DTH').map((r) => row('DTH', { SUBJID: r.SUBJID, DTHDAT: edc(r.DTHDAT), DTHCAUSE: r.DTHCAUSE })),
  }
}
