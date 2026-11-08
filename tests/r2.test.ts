// Phase 6: R missions on the specialist studies (S42 pain CM, S43 SEND BW, S44 diabetes EX), in real webR.
import { describe, expect, test } from 'vitest'
import { WebR } from 'webr'
import { R_PRELUDE, R_HOME, sessionFiles, parseCsv, starterCode } from '../src/domain/rlib'
import { createProject, dataFor } from '../src/domain/project'
import { evaluateMission, startMission, missionsFor } from '../src/domain/missions'
import { PACKS } from '../src/domain/studies'

const PROGRAMS: [string, string, string, string][] = [
  ['PNR-18-203', 'S42', 'cm', `
src <- raw$DIARY
src <- src[as.numeric(src$RESCUE) > 0, ]
cm <- data.frame(STUDYID = "PNR-18-203", DOMAIN = "CM", USUBJID = paste0("PNR-18-203-", src$SUBJID), CMSEQ = NA_integer_, CMTRT = "PARACETAMOL",
  CMCAT = "RESCUE MEDICATION", CMINDC = "LOW BACK PAIN", CMDOSE = 500, CMDOSU = "mg", CMDOSTOT = as.numeric(src$RESCUE) * 500, CMROUTE = "ORAL", EPOCH = "",
  CMSTDTC = substr(src$ENTRYDTM, 1, 10), CMENDTC = substr(src$ENTRYDTM, 1, 10), CMSTDY = NA, CMENDY = NA, stringsAsFactors = FALSE)
cm$EPOCH <- epoch_of(cm$CMSTDTC, cm$USUBJID)
cm$CMSTDY <- study_day(cm$CMSTDTC, cm$USUBJID); cm$CMENDY <- cm$CMSTDY
cm <- cm[order(cm$USUBJID, cm$CMSTDTC), ]; cm$CMSEQ <- seq_within(cm$USUBJID)
`],
  ['ZEN-T-0428', 'S43', 'bw', `
src <- raw$BWT
term <- src$BWTYPE == "Terminal (fasted)"; nd <- src$WEIGHT == ""; ex <- grepl("Excluded", src$COMMENT)
bw <- data.frame(STUDYID = "ZEN-T-0428", DOMAIN = "BW", USUBJID = paste0("ZEN-T-0428-", src$SUBJID), BWSEQ = NA_integer_,
  BWTESTCD = ifelse(term, "TERMBW", "BW"), BWTEST = ifelse(term, "Terminal Body Weight", "Body Weight"),
  BWORRES = src$WEIGHT, BWORRESU = ifelse(nd, "", "g"), BWSTRESC = src$WEIGHT, BWSTRESN = suppressWarnings(as.numeric(src$WEIGHT)), BWSTRESU = ifelse(nd, "", "g"),
  BWSTAT = ifelse(nd, "NOT DONE", ""), BWREASND = ifelse(nd, toupper(src$COMMENT), ""), BWBLFL = ifelse(src$DAY == "1", "Y", ""),
  BWFAST = ifelse(term, "Y", ""), BWEXCLFL = ifelse(ex, "Y", ""), BWREASEX = ifelse(ex, toupper(trimws(sub("^[^:]*:", "", src$COMMENT))), ""),
  BWUSCHFL = ifelse(src$BWTYPE == "Unscheduled", "Y", ""), BWDTC = src$BWDATE, BWDY = NA, BWNOMDY = suppressWarnings(as.numeric(src$DAY)),
  BWNOMLBL = ifelse(src$DAY == "", "", paste("Day", src$DAY)), stringsAsFactors = FALSE)
bw$BWDY <- study_day(bw$BWDTC, bw$USUBJID)
bw <- bw[order(bw$USUBJID, bw$BWTESTCD, bw$BWDTC), ]; bw$BWSEQ <- seq_within(bw$USUBJID)
`],
  ['INS-22-305', 'S44', 'ex', `
src <- merge(raw$DOSE, raw$IRT[, c("SUBJID", "RANDARM")], by = "SUBJID")
ex <- data.frame(STUDYID = "INS-22-305", DOMAIN = "EX", USUBJID = paste0("INS-22-305-", src$SUBJID), EXSEQ = NA_integer_,
  EXTRT = ifelse(src$RANDARM == "GLAR", "INSULIN GLARGINE", "BASALQIN"), EXDOSE = as.numeric(src$DOSEU), EXDOSU = "U", EXDOSFRM = "INJECTION, SOLUTION",
  EXDOSFRQ = "QD", EXROUTE = "SUBCUTANEOUS", EXADJ = ifelse(src$CHGRSN == "Weekly titration", "TITRATION", ifelse(grepl("hypoglycaemia", src$CHGRSN), "HYPOGLYCAEMIA", "")),
  EPOCH = "", EXSTDTC = dtc_iso(src$STDAT), EXENDTC = dtc_iso(src$ENDAT), EXSTDY = NA, EXENDY = NA, stringsAsFactors = FALSE)
ex$EPOCH <- epoch_of(ex$EXSTDTC, ex$USUBJID); ex$EXSTDY <- study_day(ex$EXSTDTC, ex$USUBJID); ex$EXENDY <- study_day(ex$EXENDTC, ex$USUBJID)
ex <- ex[order(ex$USUBJID, ex$EXTRT, ex$EXSTDTC), ]; ex$EXSEQ <- seq_within(ex$USUBJID)
`],
]

describe('R missions on the specialist studies', () => {
  for (const [study, mission, obj, code] of PROGRAMS) test(`${mission} (${study}) scores 100 from an R program`, async () => {
    const p = createProject('u', 'none', '3.4', study), data = dataFor(p)
    expect(missionsFor(p).some((m) => m.id === mission)).toBe(true)
    const w = new WebR(); await w.init()
    try {
      const run = async (c: string) => { const sh = await new w.Shelter(); try { const r = await sh.captureR(c, { captureStreams: true, captureConditions: true }); return r.output.map((o) => String(o.data?.message ?? o.data)).join('\n') } finally { await sh.purge() } }
      await w.FS.mkdir(`${R_HOME}/raw`)
      for (const [f, text] of Object.entries(sessionFiles(data))) await w.FS.writeFile(`${R_HOME}/${f}`, new TextEncoder().encode(text))
      await run(R_PRELUDE)
      const dom = obj.toUpperCase(), src = PACKS[study].refSpec(dom, p.version).source
      expect(await run(starterCode(dom, src))).not.toMatch(/Error/)
      const out = await run(code); expect(out).not.toMatch(/Error/)
      await run(`write.csv(${obj}, "/tmp/out.csv", row.names = FALSE, na = "")`)
      const t = parseCsv(new TextDecoder().decode(await w.FS.readFile('/tmp/out.csv')))
      startMission(p, mission)
      p.rOut = { [dom]: { code, utc: '2026-11-08T00:00:00Z', cols: t[0], rows: t.slice(1) } }
      const r = evaluateMission(p, mission)
      expect(r.score, r.detail.join(' | ')).toBe(100)
    } finally { w.close() }
  }, 180000)
})
