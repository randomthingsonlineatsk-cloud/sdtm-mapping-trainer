// Real R in the browser: the R session's data and the study's helper functions. The raw forms
// are written into webR's file system as CSV and read into `raw` (a list of data frames, every
// column character, blanks as ""); `dm` is the study's DM as built by the reference mapping (for
// study days and epochs) and `visits` the schedule. The helpers are base R, written for this
// trainer, and do what the trainer's functions of the same purpose do, so an R program and a
// visual mapping that follow the same conventions give the same dataset.

import type { Built, OutRow, StudyData } from './engine'
import { SORT } from './reference'
import { VISITS } from './study'

export const R_HOME = '/home/web_user'
const q = (v: unknown) => { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
export function toCsv(cols: string[], rows: Record<string, unknown>[]): string {
  return [cols.map(q).join(','), ...rows.map((r) => cols.map((c) => q(r[c])).join(','))].join('\n') + '\n'
}
// RFC 4180 CSV, as R's write.csv writes it.
export function parseCsv(text: string): string[][] {
  const out: string[][] = []; let row: string[] = [], cell = '', inq = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inq) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++ } else inq = false } else cell += ch; continue }
    if (ch === '"') inq = true
    else if (ch === ',') { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); out.push(row); row = []; cell = '' }
    else cell += ch
  }
  if (cell !== '' || row.length) { row.push(cell); out.push(row) }
  return out
}

// The files the session starts from.
export function sessionFiles(data: StudyData): Record<string, string> {
  const files: Record<string, string> = {}
  for (const [form, rows] of Object.entries(data.forms)) {
    const cols = [...new Set(rows.flatMap((r) => Object.keys(r).filter((k) => !k.startsWith('__'))))]
    files[`raw/${form}.csv`] = toCsv(cols, rows as unknown as Record<string, unknown>[])
  }
  const dm = [...(data.refDm?.values() ?? [])]
  const dmCols = dm.length ? Object.keys(dm[0]).filter((k) => !k.startsWith('__')) : ['USUBJID']
  files['dm.csv'] = toCsv(dmCols, dm)
  files['visits.csv'] = toCsv(['RAW', 'VISITNUM', 'VISIT', 'VISITDY'], (data.visits ?? VISITS).map((v) => ({ RAW: v.raw, VISITNUM: v.num, VISIT: v.name, VISITDY: v.day })))
  return files
}

export const R_PRELUDE = `
local({
  rd <- function(f) read.csv(f, colClasses = "character", na.strings = character(0), check.names = FALSE)
  forms <- sub("[.]csv$", "", list.files("${R_HOME}/raw"))
  g <- globalenv()
  assign("raw", setNames(lapply(forms, function(f) rd(sprintf("${R_HOME}/raw/%s.csv", f))), forms), envir = g)
  assign("dm", rd("${R_HOME}/dm.csv"), envir = g)
  assign("visits", rd("${R_HOME}/visits.csv"), envir = g)
})
.mon <- c("JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC")
.unk <- function(x) toupper(x) %in% c("UN", "UK", "UNK", "NK", "XX", "--")

# A raw date (and optional time) as ISO 8601. informat: "DD-MMM-YYYY" (EDC, UN/UNK for an
# unknown day or month: the result stays partial), "YYYYMMDD" (lab), "DD/MM/YYYY" (CTMS) or
# "ISO 8601" (IRT). time: "HH:MM" or "HHMM". Vectorised; stops on a value that is not a date.
dtc_iso <- function(date, informat = "DD-MMM-YYYY", time = "") {
  date <- trimws(as.character(date)); time <- rep_len(trimws(as.character(time)), length(date))
  vapply(seq_along(date), function(i) {
    s <- date[i]
    if (is.na(s) || s == "") return("")
    if (informat == "DD-MMM-YYYY") {
      p <- strsplit(s, "-", fixed = TRUE)[[1]]
      if (length(p) != 3 || !grepl("^[0-9]{4}$", p[3])) stop(sprintf("'%s' is not DD-MMM-YYYY", s))
      if (.unk(p[2])) return(p[3])
      m <- match(toupper(p[2]), .mon)
      if (is.na(m)) stop(sprintf("'%s' in '%s' is not a month", p[2], s))
      if (.unk(p[1])) return(sprintf("%s-%02d", p[3], m))
      iso <- sprintf("%s-%02d-%02d", p[3], m, as.integer(p[1]))
    } else if (informat == "YYYYMMDD") {
      iso <- paste(substr(s, 1, 4), substr(s, 5, 6), substr(s, 7, 8), sep = "-")
    } else if (informat == "DD/MM/YYYY") {
      iso <- paste(substr(s, 7, 10), substr(s, 4, 5), substr(s, 1, 2), sep = "-")
    } else return(s)
    if (is.na(as.Date(iso, optional = TRUE))) stop(sprintf("'%s' is not a calendar date", s))
    t <- time[i]
    if (!is.na(t) && t != "") {
      if (grepl("^[0-9]{4}$", t)) t <- paste0(substr(t, 1, 2), ":", substr(t, 3, 4))
      iso <- paste0(iso, "T", t)
    }
    iso
  }, "")
}

# Study day of an ISO 8601 date against the subject's RFSTDTC in dm (no day 0); NA when
# either date is partial.
study_day <- function(dtc, usubjid, ref = "RFSTDTC") {
  rf <- substr(dm[[ref]][match(usubjid, dm$USUBJID)], 1, 10); d <- substr(dtc, 1, 10)
  ok <- grepl("^[0-9]{4}-[0-9]{2}-[0-9]{2}$", d) & grepl("^[0-9]{4}-[0-9]{2}-[0-9]{2}$", rf)
  out <- rep(NA_integer_, length(d))
  diff <- as.integer(as.Date(d[ok]) - as.Date(rf[ok]))
  out[ok] <- ifelse(diff >= 0, diff + 1L, diff)
  out
}

# The epoch of a date: SCREENING before the first dose (or without one), TREATMENT to the last
# dose, FOLLOW-UP after it; "" for a partial date.
epoch_of <- function(dtc, usubjid) {
  st <- dm$RFXSTDTC[match(usubjid, dm$USUBJID)]; en <- dm$RFXENDTC[match(usubjid, dm$USUBJID)]
  st[is.na(st)] <- ""; en[is.na(en)] <- ""
  cmp <- function(a, b) if (nchar(a) > 10 && nchar(b) > 10) sign(as.numeric(substr(a, 1, 16) > substr(b, 1, 16)) - as.numeric(substr(a, 1, 16) < substr(b, 1, 16))) else sign(as.numeric(substr(a, 1, 10) > substr(b, 1, 10)) - as.numeric(substr(a, 1, 10) < substr(b, 1, 10)))
  vapply(seq_along(dtc), function(i) {
    d <- dtc[i]
    if (is.na(d) || !grepl("^[0-9]{4}-[0-9]{2}-[0-9]{2}", d)) return("")
    if (st[i] == "" || cmp(d, st[i]) < 0) return("SCREENING")
    if (en[i] == "" || substr(d, 1, 10) <= substr(en[i], 1, 10)) "TREATMENT" else "FOLLOW-UP"
  }, "")
}

# Visit number and SDTM visit name of a raw visit name, from the schedule.
visit_num <- function(visit) as.numeric(visits$VISITNUM[match(visit, visits$RAW)])
visit_name <- function(visit) visits$VISIT[match(visit, visits$RAW)]

# Hours as an ISO 8601 duration: 0.5 is PT30M, 24 is PT24H, -0.25 is -PT15M.
iso_dur <- function(hours) vapply(as.numeric(hours), function(h) {
  if (is.na(h)) return("")
  m <- round(abs(h) * 60); hh <- m %/% 60; mm <- m %% 60
  s <- paste0(if (h < 0) "-" else "", "PT", if (hh > 0) paste0(hh, "H") else "", if (mm > 0 || hh == 0) paste0(mm, "M") else "")
  if (s == "PT0M") "PT0H" else s
}, "")

# --SEQ: 1, 2, 3 ... within each subject, in the order of the rows.
seq_within <- function(usubjid) ave(seq_along(usubjid), usubjid, FUN = seq_along)
`

export const R_HELP: { sig: string; what: string }[] = [
  { sig: 'raw$CM, raw$AE, …', what: 'The raw forms as data frames: every column character, blanks as ""' },
  { sig: 'dm, visits', what: 'The study’s DM (reference mapping) and the visit schedule (RAW, VISITNUM, VISIT, VISITDY)' },
  { sig: 'dtc_iso(date, informat, time)', what: 'Raw date (and time) to ISO 8601, partial dates kept partial' },
  { sig: 'study_day(dtc, usubjid)', what: 'Study day against RFSTDTC, no day 0; NA for partial dates' },
  { sig: 'epoch_of(dtc, usubjid)', what: 'SCREENING, TREATMENT or FOLLOW-UP from the first and last dose' },
  { sig: 'visit_num(visit), visit_name(visit)', what: 'VISITNUM and VISIT of a raw visit name' },
  { sig: 'iso_dur(hours), seq_within(usubjid)', what: 'Hours as an ISO 8601 duration; 1, 2, 3 within each subject' },
]

// What the learner starts from for a domain.
export function starterCode(domain: string, source?: string): string {
  const d = domain.toLowerCase(), sort = SORT[domain] ?? ['USUBJID'], form = source ?? (domain === 'CM' ? 'CM' : domain)
  return `# ${domain} in base R. Build a data frame called ${d} with the ${domain} variables, in order.
# raw$${form} is the raw form; see the helpers listed beside the editor.
src <- raw$${form}

${d} <- data.frame(
  STUDYID = src$SUBJID[0],  # replace each line with the real derivation
  stringsAsFactors = FALSE
)

# Sort by ${sort.join(', ')}, then number --SEQ within each subject:
# ${d} <- ${d}[order(${sort.map((k) => `${d}$${k}`).join(', ')}), ]
# ${d}$${domain}SEQ <- seq_within(${d}$USUBJID)
head(${d})
`
}

// An R result as a dataset the trainer can check and score. Rows are matched to the reference
// by the domain's natural key, so the record order of the R program does not matter.
export interface RResult { code: string; utc: string; cols: string[]; rows: string[][] }
export function rBuilt(domain: string, r: RResult, keys: string[]): Built {
  const rows: OutRow[] = r.rows.map((x, i) => {
    const o = Object.fromEntries(r.cols.map((c, j) => [c, x[j] ?? ''])) as OutRow
    o.__trace = keys.every((k) => r.cols.includes(k)) ? keys.map((k) => o[k]).join('|') : `row${i}`
    o.__subj = o.USUBJID ?? ''
    return o
  })
  return { domain, vars: r.cols, rows, errors: {}, warnings: [] }
}
export const rekey = (b: Built, keys: string[]): Built => ({ ...b, rows: b.rows.map((r) => ({ ...r, __trace: keys.map((k) => r[k] ?? '').join('|') })) })
