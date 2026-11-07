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

## Coming next

- **Phase 3:** aCRF editor and acrf.pdf, define.xml v2.1 with a preview, the reviewer's guide,
  RELREC and custom domains, and a pharmacokinetics study (PC and PP).
- **Phase 4:** a full submission package mission, a certificate, writing real R in the browser,
  and an oncology study (RECIST 1.1: TU, TR, RS).
- **Phase 5:** classroom mode on the shared classroom server, a SEND lesson, an asthma study
  (RE, QS) and the vaccine study's CE, FACE and IS domains.

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
