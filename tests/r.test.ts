// Phase 4e: real R (webR, the same build the site serves) running the trainer's R session.
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { WebR } from 'webr'
import { R_PRELUDE, R_HOME, sessionFiles, parseCsv, starterCode, type RResult } from '../src/domain/rlib'
import { studyData, referenceSpec } from '../src/domain/reference'
import { build, studyFns } from '../src/domain/engine'
import { createProject } from '../src/domain/project'
import { VISITS } from '../src/domain/study'
import { evaluateMission, startMission } from '../src/domain/missions'

const CM_R = `
src <- raw$CM
cm <- data.frame(
  STUDYID = "GLV-12-301", DOMAIN = "CM", USUBJID = paste0("GLV-12-301-", src$SUBJID), CMSEQ = NA_integer_, CMSPID = src$CMSPID,
  CMTRT = src$CMTRT, CMDECOD = src$CMDECOD, CMINDC = src$CMINDC, CMCLAS = src$CMCLAS, CMDOSE = suppressWarnings(as.numeric(src$CMDOSE)),
  CMDOSU = src$CMDOSU, CMDOSFRQ = src$CMDOSFRQ, CMROUTE = toupper(src$CMROUTE), EPOCH = "",
  CMSTDTC = dtc_iso(src$CMSTDAT), CMENDTC = dtc_iso(src$CMENDAT), CMSTDY = NA, CMENDY = NA,
  CMENRTPT = ifelse(src$CMONGO == "Y", "ONGOING", ""), CMENTPT = ifelse(src$CMONGO == "Y", "END OF STUDY", ""), stringsAsFactors = FALSE)
cm$EPOCH <- epoch_of(cm$CMSTDTC, cm$USUBJID)
cm$CMSTDY <- study_day(cm$CMSTDTC, cm$USUBJID); cm$CMENDY <- study_day(cm$CMENDTC, cm$USUBJID)
cm <- cm[order(cm$USUBJID, cm$CMTRT, cm$CMSTDTC), ]
cm$CMSEQ <- seq_within(cm$USUBJID)
`
let w: WebR
const data = studyData(1)
const run = async (code: string) => {
  const sh = await new w.Shelter()
  try { const r = await sh.captureR(code, { captureStreams: true, captureConditions: true }); return r.output.map((o) => String(o.data?.message ?? o.data)).join('\n') } finally { await sh.purge() }
}
const frame = async (name: string): Promise<{ cols: string[]; rows: string[][] }> => {
  await run(`write.csv(${name}, "/tmp/out.csv", row.names = FALSE, na = "")`)
  const t = parseCsv(new TextDecoder().decode(await w.FS.readFile('/tmp/out.csv')))
  return { cols: t[0], rows: t.slice(1) }
}
beforeAll(async () => {
  w = new WebR(); await w.init()
  await w.FS.mkdir(`${R_HOME}/raw`)
  for (const [f, text] of Object.entries(sessionFiles(data))) await w.FS.writeFile(`${R_HOME}/${f}`, new TextEncoder().encode(text))
  await run(R_PRELUDE)
}, 120000)
afterAll(() => w?.close())

describe('R in the browser', () => {
  test('the session holds the raw forms, dm and the schedule', async () => {
    const out = await run('cat(length(raw), nrow(raw$CM), nrow(dm), nrow(visits), class(raw$VS$SUBJID), sep = " ")')
    expect(out).toBe(`${Object.keys(data.forms).length} ${data.forms.CM.length} ${data.refDm!.size} ${VISITS.length} character`)
  })
  test('the helpers agree with the trainer’s functions', async () => {
    const fns = studyFns(data, {}, '')
    const dates = ['10-MAR-2026', 'UN-MAR-2026', 'UN-UNK-2019', '']
    expect(await run(`cat(dtc_iso(c(${dates.map((d) => `"${d}"`).join(', ')})), sep = "|")`)).toBe(dates.map((d) => fns.dtc(d, 'DD-MMM-YYYY')).join('|'))
    expect(await run('cat(dtc_iso("20260310", "YYYYMMDD", "0915"), dtc_iso("14/03/2026", "DD/MM/YYYY"), iso_dur(c(-0.25, 0.5, 24, 1.5)), sep = "|")')).toBe('2026-03-10T09:15|2026-03-14|-PT15M|PT30M|PT24H|PT1H30M')
    expect(await run('tryCatch(dtc_iso("31-FEB-2026"), error = function(e) cat(conditionMessage(e)))')).toMatch(/not a calendar date/)
  })
  test('a CM program in R scores 100 in mission S23', async () => {
    await run(CM_R)
    const f = await frame('cm')
    const p = createProject('u')
    for (const d of ['DM']) p.specs[d] = referenceSpec(d, '3.4')
    startMission(p, 'S23')
    const ref = build(referenceSpec('CM', '3.4'), data)
    expect(f.rows.length).toBe(ref.rows.length)
    p.rOut = { CM: { code: CM_R, utc: '2026-11-08T00:00:00Z', ...f } satisfies RResult }
    const r = evaluateMission(p, 'S23')
    expect(r.score, r.detail.join(' | ')).toBe(100)
    // A wrong derivation costs credit on that variable only.
    await run('cm$CMROUTE <- tolower(cm$CMROUTE)')
    p.rOut.CM = { code: '', utc: '', ...(await frame('cm')) }
    const bad = evaluateMission(p, 'S23').domains[0].comparison.perVar.find((x) => x.v === 'CMROUTE')!
    expect(bad.credit).toBeLessThan(0.2)
  })
  test('the starter code runs', async () => {
    expect(await run(starterCode('CM'))).not.toMatch(/Error/)
  })
})
