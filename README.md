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
  CETHNIC in DM. It will be updated when CDISC publishes the final standard.
- **CDISC Controlled Terminology**: the codelists the study needs, bundled and version-stamped.

CDISC standards are used as CDISC publishes them. Conformance rules are written for this app
from the public descriptions of the CDISC conformance rules and the FDA validator and business
rules; no vendor rule text or tool is copied.

## What Phase 1 covers

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
- **Missions S1 (Map DM) and S2 (Map VS):** credit per variable against the hidden reference,
  matched record by record through the raw row each record came from, minus 3 points per kind
  of conformance error, and a pass or fail mark per domain.
- **CDM Console import:** load a project file from the CDM Query & Edit-Check Console
  (HLV-204-201 or the vaccine trial ALV-3-301) and map its forms for practice.
- **Projects:** several in one browser (IndexedDB), with user and class IDs, export and import
  as a checksummed file.

## Coming next

- **Phase 2:** AE, CM, LB, EX, DS, SUPPQUAL, value-level mapping, the trial design domains
  (TA, TE, TV, TI, TS) with SE and SV, a mapping specification, CDISC, FDA and PMDA rule sets,
  a read-only R and SAS view of each rule, loading a full NCI EVS CT file, XPT v5 and
  Dataset-JSON v1.1 export.
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
