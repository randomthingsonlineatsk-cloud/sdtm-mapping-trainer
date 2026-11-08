# SDTM Mapping Trainer

A browser practice app for the core task of a clinical or statistical programmer: turn raw
eCRF and vendor data from a trial into CDISC SDTM datasets, then check them for conformance.
You learn the structure of SDTM, map the data yourself in a visual workspace, and missions
score your datasets against a hidden reference mapping.

**Live app:** https://randomthingsonlineatsk-cloud.github.io/sdtm-mapping-trainer/

Everything is fictional: the study GLV-12-301, Glyvantra (GLV-12), Glyvant Pharmaceuticals,
the five sites and all 90 subjects. Training only; not a validated system; never enter real
patient data. Companion to the
[CDM Query & Edit-Check Console](https://github.com/randomthingsonlineatsk-cloud/cdm-query-console),
whose studies can be imported.

## Standards

- **SDTM v2.0 with SDTMIG v3.4**, the version FDA requires for studies starting on or after
  15 March 2025 (default).
- **SDTMIG v4.0 draft mode**, built from the public-review draft (February to April 2026):
  SUBJID in every general-class domain, --BLFL retired in favour of --LOBXFL, CRACE and
  CETHNIC in DM, and NS-- datasets in place of SUPP--. It will be updated when CDISC publishes
  the final standard.
- **CDISC Controlled Terminology**: the codelists the study needs, bundled and version-stamped,
  or the full quarterly SDTM terminology file from NCI EVS, loaded in the browser.

CDISC standards are used as CDISC publishes them. Conformance rules are written for this app
from the public descriptions of the CDISC conformance rules and the FDA validator and business
rules; no vendor rule text or tool is copied.

## Phase 1

- **Learn:** a map of SDTM (classes and every SDTMIG v3.4 domain), twelve short lessons with
  examples from the study and quizzes (variable roles, core status, ISO 8601, study day and
  epoch, --SEQ, original and standard results, --LOBXFL, DM reference dates and arms,
  unscheduled visits, tests not done, the v4.0 draft), and a reference of variable metadata.
- **The study GLV-12-301:** a phase 3, three-arm type 2 diabetes trial with 90 screened
  subjects at sites in the United States, Japan, Germany, India and Brazil; protocol facts,
  schedule, arms, and the sponsor's SDTM conventions.
- **Raw data:** the EDC export (DM, IC, SV, VS, EX, DS, AE, CM) with CDASH field names and
  the IRT randomisation file, with the problems real studies have: screen failures, a subject
  randomised but never dosed, a subject given the other arm's kits, a death, weights in pounds
  and heights in inches, Day 1 vital signs taken after the dose, vital signs not done,
  unscheduled visits and two races recorded for one subject.
- **Mapping workspace:** raw fields on one side, SDTM variables on the other. Each variable is
  filled by a copy, a constant, a recode to CT, an expression in a small derivation language
  (with functions for ISO 8601 dates, study day, epoch, visit numbers, unit conversion, IRT
  and cross-form look-ups), a sequence number, or the last-observation-before-exposure flag.
  Findings forms are turned from wide to tall. The dataset rebuilds as you edit.
- **Datasets & checks:** your datasets with 21 conformance rules (required and expected
  variables, CT, ISO 8601, --SEQ, study day, the DM arm rules, results and units), each
  finding linked to its record; CSV download.
- **Missions S1 (Map DM, with the individual races in SUPPDM) and S2 (Map VS):** credit per variable against the hidden reference,
  matched record by record through the raw row each record came from, minus 3 points per kind
  of conformance error, and a pass or fail mark per domain.
- **CDM Console import:** load a project file from the CDM Query & Edit-Check Console
  (HLV-204-201 or the vaccine trial ALV-3-301) and map its forms for practice.
- **Projects:** several in one browser (IndexedDB), with user and class IDs, export and import
  as a checksummed file.

## Phase 2

- **Every core domain:** AE with its dictionary coding and SUPPAE (treatment emergent flag),
  CM with partial dates and ongoing medications, EX as dosing intervals from the IRT kit arm,
  DS from three sources (end-of-study form, consent, IRT), LB from a central laboratory
  transfer, and SV. Fictional medical and drug dictionaries shaped like the industry ones.
- **A messy lab transfer:** vendor test codes, conventional units converted to SI with the
  study's lab standards table, reference ranges and NRIND, results sent twice, one site's
  units typed as mg/dl, a result of "<5", and a haemolysed sample not reported.
- **Several sources per domain:** "Add a source" stacks records from more forms into one
  domain, each with its own rules, then sorts and numbers them together.
- **Supplemental qualifiers:** a SUPP-- builder with QNAM, QLABEL, QORIG and QEVAL, linked to
  the parent through IDVAR and IDVARVAL. In SDTMIG v4.0 draft mode the same rules build NS--
  datasets instead (NSAE, NSDM): one horizontal record per parent record, linked by IDVAR and
  the numeric IDVARVLN, with labels and origins for define.xml.
- **Trial design:** TA, TE, TV, TI and TS built as tables from the protocol facts (or pasted
  from a spreadsheet), checked against each other; SE derived from DM.
- **Rule sets:** 39 conformance rules with their severity under CDISC, FDA and PMDA, including
  rejections (a TS without the study start date is rejected by FDA).
- **Mapping specification:** variable-level metadata with Define-XML 2.1 origins, sources and
  derivations, value-level metadata and supplemental qualifiers, downloadable as CSV.
- **Your mapping as code:** a read-only R (dplyr) and SAS translation of every rule.
- **Exports:** SAS Version 5 transport (XPT, with IBM floating point, checked against the
  FDA limits) and CDISC Dataset-JSON v1.1, for every dataset including SUPP-- and trial design.
- **Missions S3 to S9:** AE with SUPPAE, CM, EX, DS, LB, the trial design domains, and a
  broken AE and LB delivery to fix. Each domain gets its own score and pass mark.
- **Eight more lessons** (20 in all): SUPP--, LB standardisation, trial design, DS, EX,
  coding variables, partial dates, and submission formats and validation.

## Closer to company practice

- **Raw dates as source systems send them:** the EDC exports DD-MMM-YYYY with UN and UNK for
  unknown parts (UN-MAR-2019, UN-UNK-2019), the central laboratory YYYYMMDD with HHMM times,
  the IRT ISO 8601. `dtc(field, informat, time)` converts them, keeping partial dates partial;
  a raw date copied into a --DTC variable fails the ISO 8601 check.
- **Independent QC (double programming):** a Production / QC switch on the Mapping workspace and
  a QC compare tab that matches the two datasets by their keys, PROC COMPARE style: records and
  variables on one side only, duplicate keys, and every unequal value with examples. Each
  difference gets a resolution (production corrected, QC corrected, explained) and a note, the
  report downloads for the validation file, and sign-off is possible only when the comparison
  is clean. Mission S10 hands you a colleague's VS that passes every check but holds three
  errors only an independent comparison finds.
- **A second data transfer:** transfer 2 (database lock) brings late-entered adverse events,
  query corrections, a record deleted in the EDC, the central laboratory's switch to SI units
  from Week 26, and coding up-versioned to the next dictionary version. The Raw data tab lists
  every added, removed and changed record; Datasets compares each dataset with transfer 1.
  Mission S11 re-runs DM, AE and LB on it: a lab conversion that assumed one unit now converts
  some results twice.
- **The rest of the domains a diabetes study submits:** IE (only the criteria the screen
  failures did not meet, with the protocol text), MH (coded history with partial dates), EC
  (exposure as collected, blinded, in tablets) next to EX (as given, from the IRT), DV from the
  monitors' deviation log exported from the CTMS (dates as DD/MM/YYYY), and CO (site comments,
  long ones split between words into COVAL and COVAL1). Missions S12 (IE, MH) and S13 (EC, DV, CO).
- **Trial Summary as FDA expects it:** REGID, OUTMSPRI, PCLAS, ADAPT, INTMODEL, INTTYPE,
  objectives, stopping rules, and the data cut-off of the transfer in use; coded values in
  TSVALCD (metformin by its FDA SRS UNII, the indication by SNOMED CT 44054006, and fictional
  codes for the fictional product and its class); null flavors. Five new checks (TRN-035 to
  TRN-039) are errors under the FDA rule set and warnings under CDISC.
- **Specification first:** a Specification tab where each domain's mapping specification is
  written before programming (origin, raw field as FORM.FIELD, derivation), submitted for
  review, approved by someone other than its author, and revised only as a new version with a
  reason, with the change history. The program is checked against the approved version, and
  the Mapping workspace shows the specification line for the variable being programmed.
  Mission S14 runs the whole cycle on CM.
- **Every finding explained:** each of the 44 rules says why it matters and how to fix the
  mapping, next to its findings on Datasets and Trial design.
- **Lab time points and a range change:** Week 12 glucose is drawn before and 2 hours after the
  dose (LBTPT, LBTPTNUM, LBELTM, LBTPTREF), and the laboratory moves ALT to a new assay with a
  lower upper limit from Week 12, so LBNRIND has to follow the range on each record. The
  baseline lesson explains why reviewers rely on --LOBXFL rather than --BLFL.

## Phase 3

- **RELREC:** a Relationships tab where rules link records of two domains by a key: an
  adverse event to the medications given for it (the AE number collected on the medication
  form) and an abnormal-lab adverse event to the ALT result behind it (the lab accession
  number). RELREC is built with RELIDs and --SEQ links and checked for broken links.
  Mission S15.
- **Custom domains:** a builder that asks what the data are, lists the standard domains that
  might already hold them, requires a reason why none fits and a code starting with X, Y or Z,
  and creates the domain from the general observation class variables. The diabetes education
  form goes to the sponsor domain XE. Mission S16.
- **Annotated CRF:** every unique EDC page rendered with its fields, annotated in the standard
  syntax (domain header, VARIABLE or DOMAIN.VARIABLE, “VSORRES when VSTESTCD = SYSBP”, QVAL
  for supplemental qualifiers, RELREC, [NOT SUBMITTED]) with colours by domain; suggestions
  from your own mapping; checks that every field is annotated, every variable exists and
  every annotation matches the mapping. acrf.pdf is written in the browser with a linked table
  of contents and bookmarks by form and by visit. Mission S17.
- **define.xml v2.1:** generated from the datasets, mapping, aCRF and trial design, with
  def:Standards, class and structure, key sequences, origins of type and source (collected
  variables point to their acrf.pdf page; dictionary coding and printed test names are
  Assigned; trial design is Protocol), methods for every derivation, value-level metadata for
  findings results and supplemental qualifiers, codelists with extended values, comments, and
  leaf links. A readable preview with working links, the app's own stylesheet for opening the
  file in a browser, and define checks (origins against the aCRF, codelists against the data,
  methods, labels, keys).
- **Validation and explain-or-fix:** one validation run over the whole package (datasets,
  RELREC, trial design and define.xml) under the CDISC, FDA or PMDA rule set, with findings
  grouped into issues (records and subjects per check, dataset and variable), a run history
  that shows what was fixed since the last run, and a run report and a details file (CSV).
  Each issue is fixed or explained; Reject findings, mapping errors and define.xml findings
  cannot be explained. The locked data keep one real data issue (an adverse event that ends
  before it starts, confirmed by the site in a query). Mission scores deduct only findings
  that are not explained, and an explanation counts only for a finding the reference mapping
  raises too.
- **Reviewer's guide (cSDRG):** the PHUSE template's sections, filled from the project
  (standards and dictionary versions, source data, design, trial design datasets, aCRF,
  subject domains, conformance inputs, the issues summary with your explanations, and the
  inclusion and exclusion criteria), with your own purpose, source and domain notes; guide
  checks; csdrg.pdf with linked contents, bookmarks and page numbers.
- **Submission package:** the SDTM tabulation folder of an eCTD module 5 dataset folder
  (`m5/datasets/glv-12-301/tabulations/sdtm/`) with one .xpt per dataset, define.xml and its
  stylesheet, acrf.pdf and csdrg.pdf, zipped in the browser, with package checks (must-fix and
  unexplained issues, XPT limits, required datasets, aCRF, guide completeness, a current
  validation run). Mission S18 (Validate and explain) prepares the FDA package on the locked
  database: fix what the mapping causes, explain what is true of the data, never change data
  to make a finding go away, and complete the guide.
- **A second study, PKX-07-101 (phase 1 pharmacokinetics):** a fictional first-in-human single
  and multiple ascending dose study in healthy volunteers (5 cohorts, 46 screened, 40 dosed), with
  its own raw data, conventions, reference mapping and missions. A dosing log with exact clock
  times; a bioanalytical file with nominal day and time, actual collection times, BLQ results,
  an LLOQ, a reassayed sample, a haemolysed sample and a sample never received; and NCA output
  whose parameters are calculated from those concentrations and actual times (one parameter not
  calculable). Missions S19 (DM and EX with dose times), S20 (PC with PCTPT, PCTPTNUM, PCELTM,
  PCTPTREF and PCRFTDTC) and S21 (PP with PK codelists and units, related to PC in RELREC by
  group IDs). New checks: a pre-dose sample drawn after the dose, a time point reference without
  its date/time, and results below the LLOQ given as numbers. Start one from the Project tab.

## Phase 4

- **Levels:** guided (tips, and progress checks that show which variables still differ), standard
  (tips, score-only progress checks) and expert (no tips or progress checks; each kind of Error or
  Reject finding costs double). A run keeps the level it started at; the pass mark is the same.
- **Capstone S22, the full submission package:** every GLV-12-301 domain from the locked
  transfer (with SUPPDM, SUPPAE, the custom XE and RELREC), the trial design, the aCRF,
  define.xml, a clean FDA run with every data issue explained and the reviewer's guide.
  Datasets count 60% and the package 40%.
- **Certificate:** pass 12 of the 22 missions, including the capstone, in any of your projects in
  this browser; a verification code from your name, scores, levels and user ID; a PDF.
- **Hand-off to the TLF Programming Lab** (Datasets & checks tab, both studies): one zip with
  every dataset as Dataset-JSON v1.1 and XPT v5, define.xml with its stylesheet, and
  `handoff.json` (format `sdtm-trainer-handoff`, version 1): study, standards, transfer, each
  dataset's label, class, structure, keys, records and variable metadata (label, type, length,
  role, codelist, origin, derivation), and the validation status with every issue's explanation.
- **Real R in the browser (R tab):** webR, R compiled to WebAssembly, served from this site
  (about 45 MB, downloaded on the first run and cached). Base R with the study's raw forms loaded
  as `raw`, the study's `dm` and visit schedule, and helper functions (`dtc_iso`, `study_day`,
  `epoch_of`, `visit_num`, `visit_name`, `iso_dur`, `seq_within`) that do what the trainer's
  functions do. Mission S23 scores a CM program written in R like any other CM. The helpers
  are tested against the trainer's functions with the same webR build in Node.
- **A third study, ONK-44-302 (phase 3 oncology, RECIST 1.1):** a fictional randomised,
  open-label study of ONK-44 against docetaxel in advanced non-small cell lung cancer (48
  screened, 42 randomised). Lesions identified at screening and new lesions on study, each
  lesion measured every 6 weeks (short axis for lymph nodes, too small to measure, a scan not
  done), the site's sum of diameters, the investigator's responses and a blinded independent
  central review's, prior surgery and radiotherapy, deaths with partial dates, and scans that
  continue in follow-up after treatment stops. Responses follow the RECIST 1.1 rules from the
  measurements, with the discrepancies real data has (an investigator PR at a 26% decrease, a
  sum of diameters 10 mm off). Missions S24 (TU and TR), S25 (RS from two assessors, and
  dataset-level RELREC: TU to TR, TR to RS) and S26 (DM with deaths, DD and PR). New checks:
  measurements of lesions not in TU, death details without DTHFL, new lesions before the first
  dose, new lesions without PD, and a sum of diameters that does not add up.

## Phase 5

- **Classroom mode (optional):** an instructor creates a class and sets missions as
  assignments, each at a level (guided, standard or expert) with a due date; students join with
  a six-letter code, run the mission in a project on the mission's study and submit it; the
  instructor re-scores each submission in their own browser (the app's own scoring, on the
  project as submitted, at the run's level and rule set), comments, and sees a leaderboard.
  It is the only feature that talks to a server: the shared classroom server (Cloudflare
  Worker and D1) kept in the
  [eCTD Dossier Builder](https://github.com/randomthingsonlineatsk-cloud/ectd-dossier-builder)
  repository, routes under `/sdtm/v1` with its own `sdtm_` tables. Set `VITE_CLASSROOM_API` at
  build time to use your own.

- **SEND lesson:** how the same model carries nonclinical (animal) studies: SENDIG, trial
  sets, BW, MI and the rest, with a quiz.
- **AIR-09-202, an asthma study (missions S27 and S28):** a spirometry vendor's file to RE
  (only the reportable BEST row, FEV1, FVC, the ratio and % predicted, pre- and
  post-bronchodilator at screening, a session with no acceptable manoeuvre kept as NOT DONE),
  a symptom questionnaire to QS (item scores and a derived total only when every item was
  answered), and inhaled doses to EX.
- **ALV-3-301, a vaccine study (missions S29 and S30):** the e-diary's solicited reactions to
  CE (one record per reaction per dose, occurred or not, worst grade by the FDA 2007 toxicity
  grading scale, a reaction continuing past Day 7) and FA (each day's grade or diameter, missed
  diary days NOT DONE), diary temperatures to VS, serology titres to IS (reciprocal titres,
  results below the lowest dilution, a sample with too little serum), and two intramuscular
  doses to EX. A lesson on the respiratory and vaccine therapeutic area guides goes with them.

## Coming next

- Further therapeutic areas and a SEND practice study, on request.

## Run it

```bash
npm install
npm run dev      # local development
npm test         # unit tests
npm run build    # production build in dist/
```

## Licence

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

Built by Khan Gulrez Shagufa Fazal Ahmed.
