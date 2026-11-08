// Learn mode: short lessons on SDTM structure, each with an example from GLV-12-301 and a quiz.
// The rules are those of SDTM v2.0 and SDTMIG v3.4 unless a lesson says otherwise.

export interface Question { q: string; options: string[]; answer: number; why: string }
export interface Topic { id: string; title: string; body: string[]; example?: { head: string[]; rows: string[][]; caption: string }; quiz: Question[] }

export const TOPICS: Topic[] = [
  { id: 'structure', title: 'SDTM at a glance',
    body: [
      'SDTM organises collected data into domains. Each domain is one dataset with a two-letter code (DM, AE, VS) and a fixed structure, described in one sentence such as “one record per vital sign measurement per time point per visit per subject”.',
      'Most domains belong to one of three general observation classes. Interventions are things given to the subject (EX, CM). Events are things that happen to the subject (AE, DS, MH). Findings are results of planned evaluations (VS, LB, EG). Findings About holds findings about an event or intervention (FA).',
      'Around them sit special-purpose domains (DM, SV, SE, CO), trial design domains that describe the protocol rather than subjects (TA, TE, TV, TI, TS), and relationship datasets (RELREC, SUPP--).',
      'Variable names start with the domain code where the variable belongs to the domain (VSTESTCD, AESTDTC). Identifiers shared by every domain, such as STUDYID, USUBJID and VISITNUM, do not.',
    ],
    quiz: [
      { q: 'Which general observation class does EX (Exposure) belong to?', options: ['Events', 'Interventions', 'Findings', 'Special-purpose'], answer: 1, why: 'Exposure records study treatment given to the subject: an intervention.' },
      { q: 'Where do trial arms and visits as planned in the protocol go?', options: ['DM and SV', 'TA and TV', 'SUPPDM', 'CO'], answer: 1, why: 'Trial design domains describe the protocol: TA for arms, TV for planned visits. SV records the visits each subject actually had.' },
    ] },
  { id: 'roles', title: 'Variable roles',
    body: [
      'Every SDTM variable has a role. Identifier variables identify the study, subject, domain and record (STUDYID, USUBJID, DOMAIN, --SEQ). The topic variable says what the record is about (VSTESTCD, AETERM, EXTRT).',
      'Qualifiers add detail. Grouping qualifiers group records (--CAT). Result qualifiers hold the answer (--ORRES, --STRESC). Synonym qualifiers give another name for the topic (VSTEST, AEDECOD). Record qualifiers describe the whole record (VSPOS, AESER). Variable qualifiers describe another variable (--ORRESU describes --ORRES).',
      'Timing variables place the record in time (--DTC, --DY, VISITNUM, EPOCH).',
    ],
    example: { caption: 'One VS record from GLV-12-301 by role', head: ['Variable', 'Value', 'Role'], rows: [['USUBJID', 'GLV-12-301-101-003', 'Identifier'], ['VSTESTCD', 'WEIGHT', 'Topic'], ['VSTEST', 'Weight', 'Synonym qualifier'], ['VSORRES', '233.1', 'Result qualifier'], ['VSORRESU', 'LB', 'Variable qualifier'], ['VSDTC', '2026-01-27T09:01', 'Timing']] },
    quiz: [
      { q: 'What role does VSORRESU have?', options: ['Result qualifier', 'Variable qualifier', 'Record qualifier', 'Timing'], answer: 1, why: 'It qualifies another variable (VSORRES) by giving its unit.' },
      { q: 'Which is the topic variable of AE?', options: ['AEDECOD', 'AESEQ', 'AETERM', 'AESER'], answer: 2, why: 'AETERM, the reported term, is what the record is about; AEDECOD is its dictionary synonym.' },
    ] },
  { id: 'core', title: 'Required, Expected, Permissible',
    body: [
      'Core status says whether a variable must be in the dataset and whether it may be null. Required variables must be present and never null (STUDYID, USUBJID, VSTESTCD).',
      'Expected variables must be present as columns, but may be null when the value was not collected or does not apply (DM.ARMNRS is null for treated subjects; DM.DTHDTC is null for subjects alive).',
      'Permissible variables are included when the study collects or derives them (VSPOS, DMDY). A permissible variable the study did not collect is left out.',
      'Leaving out an Expected column is a conformance finding even if every value would be null.',
    ],
    quiz: [
      { q: 'No subject in a study died. What happens to DTHDTC (Expected) in DM?', options: ['Leave the column out', 'Keep the column, null for everyone', 'Set it to N', 'Move it to SUPPDM'], answer: 1, why: 'Expected columns stay in the dataset even when all values are null.' },
      { q: 'May VSTESTCD be null on a vital signs record?', options: ['Yes, when the test was not done', 'No, it is Required', 'Only at unscheduled visits', 'Only in SDTMIG v4.0'], answer: 1, why: 'VSTESTCD is the topic variable and Required. A test not done still has its VSTESTCD, with VSSTAT = NOT DONE.' },
    ] },
  { id: 'iso', title: 'ISO 8601 dates and times',
    body: [
      'All --DTC variables use ISO 8601: YYYY-MM-DD, and THH:MM (or THH:MM:SS) when a time is collected, as in 2026-03-10T09:00.',
      'Raw data rarely arrives that way. This study’s EDC exports DD-MMM-YYYY (10-MAR-2026) with the time in its own field; the central laboratory sends YYYYMMDD (20260310) with times as HHMM; the IRT file is already ISO 8601. Each source needs its own conversion, which is why the specification names the informat of every raw date.',
      'Partial dates are truncated from the right: the EDC exports an unknown day as UN-MAR-2026, which becomes 2026-03, and an unknown month as UN-UNK-2019, which becomes 2019 (a known day is not kept without its month). Never invent the missing part (2026-03-01) and never carry UN or UNK into SDTM.',
      'The time is kept only when it was collected, and only on a complete date. A date without a time stays a date: there is no T00:00. In the workspace, dtc(field, informat, time) does the conversion; a raw date copied straight into a --DTC variable fails the ISO 8601 check.',
    ],
    example: { caption: 'From the raw export to --DTC', head: ['Source', 'Raw date', 'Raw time', '--DTC'], rows: [['EDC', '10-MAR-2026', '09:00', '2026-03-10T09:00'], ['EDC', '10-MAR-2026', '', '2026-03-10'], ['EDC', 'UN-MAR-2026', '', '2026-03'], ['EDC', 'UN-UNK-2026', '', '2026'], ['Central lab', '20260310', '0915', '2026-03-10T09:15'], ['IRT', '2026-03-10', '', '2026-03-10']] },
    quiz: [
      { q: 'A start date is known only as March 2026. What is --STDTC?', options: ['2026-03-01', '2026-03-UN', '2026-03', '03/2026'], answer: 2, why: 'Truncate the unknown part; never impute in SDTM.' },
      { q: 'A visit date was collected without a time. What is VSDTC?', options: ['2026-02-07T00:00', '2026-02-07', '2026-02-07T', '2026-02-07T12:00'], answer: 1, why: 'Only collected precision is submitted.' },
      { q: 'The EDC exports an AE start date as UN-UNK-2025. What is AESTDTC?', options: ['2025-01-01', '2025', 'UN-UNK-2025', '2025-UN-UN'], answer: 1, why: 'Only the year is known: truncate to 2025.' },
      { q: 'The lab file has COLLDATE 20260310 and COLLTIME 0915. What is LBDTC?', options: ['20260310T0915', '2026-03-10T09:15', '2026-03-10', '10-MAR-2026 09:15'], answer: 1, why: 'Convert the vendor format to ISO 8601 and add the collected time.' },
    ] },
  { id: 'studyday', title: 'Study day and epoch',
    body: [
      'Study day counts from the reference start date in DM, RFSTDTC. On or after it, --DY = date − RFSTDTC + 1; before it, --DY = date − RFSTDTC. So the day of the first dose is day 1 and the day before is day −1. There is no day 0.',
      'Study day is only calculated from complete dates. A partial date gives a null --DY.',
      'EPOCH places a record in the period of the trial it falls in. In GLV-12-301, anything before the first dose is SCREENING, from the first dose to the last dose date is TREATMENT, and after that FOLLOW-UP. Day 1 vital signs taken before the dose therefore fall in SCREENING.',
    ],
    example: { caption: 'Subject 101-003, RFSTDTC 2026-02-07T10:35', head: ['Date', 'Study day'], rows: [['2026-01-27', '−11'], ['2026-02-06', '−1'], ['2026-02-07', '1'], ['2026-02-22', '16']] },
    quiz: [
      { q: 'RFSTDTC is 2026-02-07. What is the study day of 2026-02-06?', options: ['0', '−1', '−2', '1'], answer: 1, why: 'Before the reference date: date − RFSTDTC = −1. There is no day 0.' },
      { q: 'An AE started in “2026-03” (day unknown). What is AESTDY?', options: ['Computed from 2026-03-01', 'Computed from 2026-03-15', 'Null', '0'], answer: 2, why: 'Study day needs complete dates.' },
    ] },
  { id: 'seq', title: '--SEQ, keys and sort order',
    body: [
      '--SEQ is a number that identifies a record uniquely within a subject in a domain. It must be unique for each USUBJID, but it does not have to start at 1 or be consecutive, and it carries no meaning of its own.',
      'Datasets are sorted by their key variables, defined in the define.xml. For VS in this study: STUDYID, USUBJID, VSTESTCD, VISITNUM, VSDTC. The trainer numbers --SEQ after sorting.',
      'Other records refer to a record through --SEQ, for example in RELREC and supplemental qualifiers, so --SEQ must not change between data deliveries without reason.',
    ],
    quiz: [
      { q: 'Must VSSEQ be unique across the whole VS dataset?', options: ['Yes', 'No, within USUBJID', 'No, within VSTESTCD', 'No, within VISITNUM'], answer: 1, why: 'Unique within a subject in a domain.' },
    ] },
  { id: 'results', title: 'Original and standard results',
    body: [
      '--ORRES and --ORRESU hold the result and unit exactly as collected. --STRESC holds the result in a standard format and unit for every record that has a result; --STRESN holds it as a number when it is numeric; --STRESU is the standard unit.',
      'Units are CT values and case matters: pound is LB, inch is in, beats per minute is beats/min.',
      'In GLV-12-301 the US site records weight in pounds. 233.1 LB becomes 105.7 kg (×0.45359237, 1 decimal). A result already in the standard unit is copied unchanged.',
    ],
    example: { caption: 'Weight at the US site', head: ['VSORRES', 'VSORRESU', 'VSSTRESC', 'VSSTRESN', 'VSSTRESU'], rows: [['233.1', 'LB', '105.7', '105.7', 'kg'], ['77', 'kg', '77', '77', 'kg']] },
    quiz: [
      { q: 'The CRF unit field says “lb”. What is VSORRESU?', options: ['lb', 'LB', 'pound', 'kg'], answer: 1, why: 'Units are submitted as CT values; the CT value for pound is LB.' },
      { q: 'Which variable keeps the value exactly as collected?', options: ['VSSTRESC', 'VSSTRESN', 'VSORRES', 'VSSTRESU'], answer: 2, why: 'ORRES: original result.' },
    ] },
  { id: 'baseline', title: 'Baseline: --LOBXFL',
    body: [
      'Why --LOBXFL and not --BLFL: since SDTMIG v3.3, --LOBXFL is Expected in findings domains and has one fixed definition (the last non-missing result on or before the first dose), so reviewers can rely on it across studies. --BLFL is still Permissible in v3.3 and v3.4, but “baseline” is a sponsor or analysis decision (an average of screening values, or a protocol-defined visit) that belongs in ADaM (ABLFL); the SDTMIG v4.0 draft retires --BLFL.',
      '--LOBXFL (Last Observation Before Exposure Flag) is Y on the last non-missing result of each test taken before the first dose (RFXSTDTC). It is the standard pre-treatment flag in SDTMIG v3.4, where --BLFL became permissible; the v4.0 draft retires --BLFL.',
      'Compare to the minute when both have a time. In GLV-12-301 subject 104-005 had Day 1 vital signs recorded 25 minutes after the dose, so the flag stays on the screening values.',
      'A test not done has no result, so it cannot carry the flag: subject 102-004’s Day 1 vital signs were not done, and the flag is on screening.',
    ],
    quiz: [
      { q: 'Day 1 blood pressure was taken at 11:23; the first dose was at 10:58. Which record gets VSLOBXFL = Y?', options: ['The Day 1 record', 'The screening record', 'Both', 'Neither'], answer: 1, why: 'Only results on or before RFXSTDTC qualify; 11:23 is after the dose.' },
    ] },
  { id: 'dm', title: 'DM: reference dates and arms',
    body: [
      'DM has one record per subject, including screen failures. Its reference dates are sponsor-defined and documented: RFSTDTC (reference start), RFENDTC, RFXSTDTC and RFXENDTC (first and last exposure), RFICDTC (consent), RFPENDTC (end of participation).',
      'ARMCD and ARM are the planned arm; ACTARMCD and ACTARM the arm actually received. When either is null, ARMNRS gives the reason from CT: SCREEN FAILURE, NOT ASSIGNED, ASSIGNED, NOT TREATED or UNPLANNED TREATMENT. ACTARMUD describes an unplanned treatment.',
      'DTHFL is Y for subjects who died and null otherwise; it is never N.',
    ],
    example: { caption: 'Three GLV-12-301 subjects', head: ['SUBJID', 'ARMCD', 'ACTARMCD', 'ARMNRS'], rows: [['101-004 (screen failure)', '', '', 'SCREEN FAILURE'], ['103-007 (never dosed)', 'GLV5', '', 'ASSIGNED, NOT TREATED'], ['102-009 (other arm’s kits)', 'GLV10', 'GLV5', '']] },
    quiz: [
      { q: 'A subject was randomised but withdrew before the first dose. What are ACTARMCD and ARMNRS?', options: ['The planned arm; null', 'Null; ASSIGNED, NOT TREATED', 'Null; SCREEN FAILURE', 'PLACEBO; null'], answer: 1, why: 'No treatment was received, so the actual arm is null and ARMNRS says why.' },
      { q: 'A subject did not die. What is DTHFL?', options: ['N', 'Null', 'U', 'NA'], answer: 1, why: 'DTHFL is Y or null.' },
    ] },
  { id: 'visits', title: 'Visits: VISITNUM and unscheduled visits',
    body: [
      'VISITNUM and VISIT come from the trial visits (TV) for planned visits. An unscheduled visit has no planned number, so sponsors give it one by a stated rule.',
      'In GLV-12-301 the rule is: the number of the last scheduled visit before it plus .01, .02 and so on, with VISIT = UNSCHEDULED 4.01. Subject 104-011 had one unscheduled visit after Week 4 (4.01) and two after Week 8 (5.01, 5.02).',
      'SV holds one record per visit each subject actually had, scheduled or not.',
    ],
    quiz: [
      { q: 'An unscheduled visit falls between Week 8 (VISITNUM 5) and Week 12 (6). It is the second one after Week 8. What is VISITNUM?', options: ['5.5', '5.02', '6.02', '0'], answer: 1, why: 'Last scheduled visit before it plus .02, under this study’s rule.' },
    ] },
  { id: 'notdone', title: 'Tests not done',
    body: [
      'When a planned test was not done, a record can still be submitted, with --STAT = NOT DONE and the reason in --REASND. --ORRES and the standard results stay null.',
      'A result that is simply absent because the test was not planned at that visit produces no record at all.',
      'In GLV-12-301 a whole Day 1 vital signs form was not done for subject 102-004: one record per test planned at Day 1, each NOT DONE.',
    ],
    quiz: [
      { q: 'Height is measured only at screening. At Week 4 the height field is empty. What goes into VS?', options: ['A HEIGHT record with VSSTAT = NOT DONE', 'Nothing for height', 'A HEIGHT record with VSORRES = 0', 'A HEIGHT record with null results and no status'], answer: 1, why: 'Not planned means no record; NOT DONE is for planned tests not performed.' },
    ] },
  { id: 'suppqual', title: 'Supplemental qualifiers (SUPP--)',
    body: [
      'A collected or derived value that has no variable in the SDTMIG goes to a supplemental qualifier dataset, SUPP-- (SUPPAE for AE), as name and value pairs. New variables may not be added to a standard domain.',
      'Each SUPP-- record names its parent: RDOMAIN, USUBJID, and IDVAR with IDVARVAL (usually --SEQ and its value). For DM, which has one record per subject, IDVAR and IDVARVAL are null.',
      'QNAM is the qualifier’s name (up to 8 characters, starting with a letter, as for any SAS V5 variable name) and QLABEL its label (up to 40). QVAL holds the value; QORIG its origin (Collected, Derived, Assigned) and QEVAL who evaluated it when that matters (e.g. INVESTIGATOR).',
      'Use SUPP-- only when there is no standard variable. A value with a standard home (AESER, AEOUT) goes there, never into SUPPAE.',
      'The SDTMIG v4.0 draft replaces SUPP-- with NS-- datasets (NSAE, NSDM): one horizontal record per parent record, each non-standard variable a column (character or numeric), linked by IDVAR = --SEQ and its numeric value IDVARVLN (both null in NSDM). Labels and origins move to define.xml. Switch the project to v4.0 draft mode to build them.',
    ],
    example: { caption: 'SUPPAE for GLV-12-301 (treatment emergent flag)', head: ['RDOMAIN', 'USUBJID', 'IDVAR', 'IDVARVAL', 'QNAM', 'QLABEL', 'QVAL', 'QORIG'], rows: [['AE', 'GLV-12-301-101-002', 'AESEQ', '1', 'AETRTEM', 'Treatment Emergent Flag', 'Y', 'Derived'], ['AE', 'GLV-12-301-101-002', 'AESEQ', '2', 'AETRTEM', 'Treatment Emergent Flag', 'N', 'Derived']] },
    quiz: [
      { q: 'What links a SUPPAE record to its AE record?', options: ['QNAM and QVAL', 'USUBJID with IDVAR = AESEQ and IDVARVAL', 'AETERM', 'The row order'], answer: 1, why: 'The parent is the AE record of that subject whose AESEQ equals IDVARVAL.' },
      { q: 'A subject recorded two races. Where do the individual races go?', options: ['Two DM records', 'RACE = “ASIAN, WHITE”', 'RACE = MULTIPLE, with RACE1 and RACE2 in SUPPDM', 'They are not submitted'], answer: 2, why: 'DM has one record per subject. RACE is MULTIPLE and each race goes to SUPPDM (IDVAR null).' },
      { q: 'In the v4.0 draft, how many NSAE records does an AE record with two non-standard values have?', options: ['Two, one per value', 'One, with both values as columns', 'None: they move into AE', 'One per subject'], answer: 1, why: 'NS-- is horizontal: one record per parent record, linked by IDVAR = AESEQ and IDVARVLN.' },
    ] },
  { id: 'lb', title: 'LB: units, conversion and reference ranges',
    body: [
      'A central laboratory sends its own test codes and units. The mapping follows the data transfer agreement and the sponsor’s lab standards: vendor code to LBTESTCD, the standard unit, and the factor from the conventional unit.',
      'LBORRES, LBORRESU, LBORNRLO and LBORNRHI keep what the lab reported. LBSTRESC (text), LBSTRESN (numeric) and LBSTRESU carry the standardised result, and LBSTNRLO and LBSTNRHI the converted range. Units must be CT values: a vendor’s “mg/dl” is mg/dL.',
      'A result such as “<5” is not a number: LBSTRESC keeps “<5” and LBSTRESN is null. A result never produced (a haemolysed sample) is a record with LBSTAT = NOT DONE and the reason in LBREASND.',
      'LBNRIND says where the result falls against the reference range (NORMAL, LOW, HIGH, ABNORMAL). A file can arrive with records sent twice: remove the duplicates by accession number and test before mapping, and say so in the reviewer’s guide.',
      'Ranges belong to the record, not the test: a laboratory that changes assay mid-study sends a new range with every result from then on, and LBNRIND follows the range on its own record. A test drawn more than once at a visit (before and after a dose) is told apart by its time point: LBTPT, LBTPTNUM, the planned elapsed time LBELTM (ISO 8601 duration, negative before the reference) and LBTPTREF.',
    ],
    example: { caption: 'Glucose from mg/dL to mmol/L (factor 0.0555, 1 decimal)', head: ['LBTESTCD', 'LBORRES', 'LBORRESU', 'LBSTRESC', 'LBSTRESN', 'LBSTRESU', 'LBNRIND'], rows: [['GLUC', '162', 'mg/dL', '9.0', '9', 'mmol/L', 'HIGH'], ['ALT', '<5', 'U/L', '<5', '', 'U/L', 'NORMAL']] },
    quiz: [
      { q: 'The lab reports ALT as “<5”. What is LBSTRESN?', options: ['5', '4.9', '0', 'Null'], answer: 3, why: 'A qualified result is kept as text in LBSTRESC; LBSTRESN holds numbers only.' },
      { q: 'Which variables keep the lab’s own unit?', options: ['LBSTRESU', 'LBORRESU', 'Both', 'Neither'], answer: 1, why: 'LBORRESU is the original unit (as a CT value); LBSTRESU is the standard unit.' },
    ] },
  { id: 'design', title: 'Trial design: TA, TE, TV, TI, TS and SE',
    body: [
      'Elements (TE) are the building blocks of the protocol: screening, each treatment, follow-up. Each has a start rule, an end rule and a planned duration (TEDUR, ISO 8601: P26W).',
      'Arms (TA) list the elements of each arm in order (TAETORD) and the epoch each belongs to. TABRANCH sits on the element at whose end the subject is assigned to an arm: here, screening ends with randomisation.',
      'Trial visits (TV) are the planned visits with VISITNUM, VISIT and VISITDY. Trial inclusion/exclusion (TI) holds every criterion; IE only the ones a subject failed.',
      'Trial summary (TS) is one record per parameter value: phase, blinding, planned and actual subjects, ages, countries (one FCNTRY each), SDTM and IG versions. FDA rejects a study whose TS lacks the study start date (SSTDTC). SE records each subject’s actual path through the elements.',
      'FDA expects more than the SDTMIG asks for: the registry ID (REGID), primary outcome (OUTMSPRI), pharmacologic class (PCLAS), intervention model and type, adaptive design (ADAPT), and the data cut-off (DCUTDTC, DCUTDESC). Some values must carry a code from an outside dictionary in TSVALCD, named in TSVCDREF: the treatment and background therapy by their FDA SRS UNII, the indication by its SNOMED CT concept, the class from MED-RT. A value that is unknown or does not apply goes in TSVALNF as a null flavor (NI, NA, UNK…) with TSVAL left null.',
    ],
    example: { caption: 'TA for one arm of GLV-12-301', head: ['ARMCD', 'TAETORD', 'ETCD', 'ELEMENT', 'TABRANCH', 'EPOCH'], rows: [['GLV5', '1', 'SCRN', 'Screening', 'Randomized to GLV-12 5 mg', 'SCREENING'], ['GLV5', '2', 'GLV5', 'GLV-12 5 mg', '', 'TREATMENT'], ['GLV5', '3', 'FU', 'Follow-up', '', 'FOLLOW-UP']] },
    quiz: [
      { q: 'The study has sites in five countries. How many FCNTRY records does TS have?', options: ['One, listing all five', 'Five', 'None: COUNTRY is in DM', 'One per site'], answer: 1, why: 'A TS parameter with several values has one record per value, numbered by TSSEQ.' },
      { q: 'Which TS parameter does FDA reject a submission without?', options: ['TITLE', 'SSTDTC', 'NARMS', 'SPONSOR'], answer: 1, why: 'The FDA technical rejection criteria require the study start date in TS.' },
      { q: 'TS INDIC is “Type 2 diabetes mellitus”. What goes in TSVALCD and TSVCDREF?', options: ['The NCI C-code and CDISC', '44054006 and SNOMED', 'E11 and ICD-10', 'Nothing'], answer: 1, why: 'FDA expects the indication coded with SNOMED CT.' },
    ] },
  { id: 'ds', title: 'DS: disposition events and milestones',
    body: [
      'DS records how a subject left each epoch (DISPOSITION EVENT) and protocol milestones such as informed consent and randomisation (PROTOCOL MILESTONE), in DSCAT.',
      'For a disposition event, DSDECOD comes from the Completion/Reason for Non-Completion codelist (COMPLETED, ADVERSE EVENT, DEATH…). For a milestone it comes from the Protocol Milestone codelist (INFORMED CONSENT OBTAINED, RANDOMIZED).',
      'DSTERM is the reported text; when nothing was written, it is the CT term. DSSTDTC is the date of the event. The records come from several forms: the end-of-study form, the consent form and the IRT randomisation file.',
    ],
    quiz: [
      { q: 'Which codelist does DSDECOD use for informed consent?', options: ['NCOMPLT', 'PROTMLST', 'DSCAT', 'NY'], answer: 1, why: 'Informed consent is a protocol milestone: PROTMLST.' },
    ] },
  { id: 'iemh', title: 'IE, MH, DV and CO',
    body: [
      'IE records only the eligibility criteria a subject did not meet: an inclusion criterion not met (IEORRES N) or an exclusion criterion met (IEORRES Y). A subject who met every criterion has no IE records. IETEST is the criterion text, the one --TEST allowed to run to 200 characters, and matches TI.',
      'MH holds the conditions the subject had before the study, coded like adverse events (MHDECOD, MHBODSYS). Its dates are often partial, and a condition still present at screening has MHENRTPT = ONGOING.',
      'DV lists protocol deviations. They are rarely in the EDC: monitors record them in the clinical trial management system, so DV is mapped from a separate export with its own formats. Whether a deviation is important matters to reviewers.',
      'CO holds free-text comments, each linked to the domain it was written on through RDOMAIN (and to a record through IDVAR when there is one). A comment over 200 characters continues in COVAL1, COVAL2, … split between words.',
    ],
    example: { caption: 'IE for a screen failure', head: ['USUBJID', 'IETESTCD', 'IETEST', 'IECAT', 'IEORRES'], rows: [['GLV-12-301-101-004', 'EX02', 'Any other glucose-lowering drug in the last 12 weeks', 'EXCLUSION', 'Y']] },
    quiz: [
      { q: 'A subject met every eligibility criterion. How many IE records?', options: ['One with IEORRES Y', 'Six, one per criterion', 'None', 'One with IEORRES NA'], answer: 2, why: 'IE holds criteria not met only.' },
      { q: 'Inclusion criterion IN02 (HbA1c range) was not met. What is IEORRES?', options: ['Y', 'N', 'NOT MET', 'FAIL'], answer: 1, why: 'The answer to the criterion: N for an inclusion criterion not met.' },
      { q: 'Where do protocol deviations usually come from?', options: ['The EDC', 'The CTMS deviation log', 'The IRT', 'The lab'], answer: 1, why: 'Monitors log deviations in the CTMS; DV is mapped from its export.' },
    ] },
  { id: 'ex', title: 'EX: exposure as dosing intervals',
    body: [
      'EX has one record per constant-dosing interval: while dose, frequency and route stay the same, one record from its start to its end date.',
      'EXTRT is the treatment actually taken, not the one planned. In a blinded study the CRF does not say which treatment was taken: it comes from the IRT kit numbers once the study is unblinded. Placebo is recorded as PLACEBO with EXDOSE 0.',
      'RFXSTDTC and RFXENDTC in DM are the first and last EX dates. A subject randomised but never dosed has no EX records.',
      'EC (exposure as collected) records the treatment as the site saw it: in a blinded study, the kit label (GLV-12 OR PLACEBO) and the tablets taken. Both EC and EX are submitted when they differ, as they do in a blinded study.',
    ],
    quiz: [
      { q: 'A subject was randomised to 5 mg but received 10 mg kits. What is EXTRT and EXDOSE?', options: ['GLV-12, 5', 'GLV-12, 10', 'PLACEBO, 0', 'GLV-12 5 mg, null'], answer: 1, why: 'EX records what was actually taken. ARMCD keeps the planned arm; ACTARMCD the actual one.' },
    ] },
  { id: 'coding', title: 'AE and CM coding variables',
    body: [
      'Adverse events are coded to a medical dictionary hierarchy: lowest level term, preferred term, high level term, high level group term and system organ class. AEDECOD is the preferred term; AELLT, AEHLT, AEHLGT and AESOC with their codes (AELLTCD…) carry the rest.',
      'AEBODSYS and AEBDSYCD are the primary system organ class used for analysis. A term can link to several system organ classes; the primary one is chosen by the dictionary.',
      'Medications are coded to a drug dictionary. CMTRT stays as reported (trade names included); CMDECOD is the standardised drug name and CMCLAS with CMCLASCD the drug class. This study uses fictional dictionaries shaped like the industry ones.',
    ],
    quiz: [
      { q: 'Which variable holds the system organ class used for analysis?', options: ['AESOC', 'AEHLGT', 'AEBODSYS', 'AEDECOD'], answer: 2, why: 'AEBODSYS is the primary system organ class; in this study it is AESOC as coded.' },
    ] },
  { id: 'partial', title: 'Partial dates and ongoing events',
    body: [
      'Dates are submitted only to the precision collected: a medication started in March 2019 (exported as UN-MAR-2019) is CMSTDTC = 2019-03, not 2019-03-01. Imputed dates belong in ADaM, not SDTM.',
      'With a partial date, study day (--DY) and epoch cannot be derived reliably and stay null.',
      'Something still going on at the end of the study has no end date. --ENRTPT says how it relates to a reference time point (ONGOING) and --ENTPT names that time point (END OF STUDY).',
    ],
    quiz: [
      { q: 'A medication started “2019, month unknown”. What is CMSTDTC?', options: ['2019-01-01', '2019', '2019-UN-UN', 'Null'], answer: 1, why: 'ISO 8601 allows reduced precision: the year alone.' },
    ] },
  { id: 'exports', title: 'Submitting: XPT, Dataset-JSON and validation',
    body: [
      'FDA and PMDA receive SDTM datasets as SAS Version 5 transport files (XPT): variable names up to 8 characters, labels up to 40, character values up to 200 bytes, ASCII only. Numbers are stored in IBM floating point.',
      'Dataset-JSON is CDISC’s JSON exchange format, with each dataset’s metadata and rows in one file. FDA has been evaluating it as a successor to XPT.',
      'Before submission the datasets are validated. CDISC publishes conformance rules for the standard; FDA and PMDA publish their own validation and business rules, and FDA technical rejection criteria can stop a submission at the gateway. The same finding can be a warning for one and a rejection for another.',
    ],
    quiz: [
      { q: 'Your SUPPAE has QNAM = AETREATEMERG. What goes wrong?', options: ['Nothing', 'It is longer than 8 characters: not a valid XPT name', 'It must start with SUPP', 'QNAM must be numeric'], answer: 1, why: 'QNAM values become variable names when SUPP-- is transposed, so they follow the 8-character rule.' },
    ] },
  { id: 'relrec', title: 'RELREC and custom domains',
    body: [
      'RELREC says which records of different domains belong together: an adverse event and the medication given for it, or an abnormal-lab adverse event and the result behind it. Each record of a related group is one RELREC row (RDOMAIN, USUBJID, IDVAR = --SEQ, IDVARVAL) and the group shares a RELID. RELTYPE is used only for dataset-level relationships (ONE, MANY).',
      'The link usually comes from fields the CRF collects only to tie records together, such as the AE number on a medication form. They are not submitted as variables; RELREC carries the relationship.',
      'A custom (sponsor-defined) domain is allowed only when no published domain fits the data. Its code starts with X, Y or Z, which CDISC reserves for sponsors; it follows one of the general observation classes (interventions, events, findings) with the domain prefix on every variable, and define.xml and the reviewer’s guide say why it was needed.',
    ],
    example: { caption: 'RELREC for an adverse event treated with one medication', head: ['RDOMAIN', 'USUBJID', 'IDVAR', 'IDVARVAL', 'RELID'], rows: [['AE', 'GLV-12-301-101-002', 'AESEQ', '2', 'AECM1'], ['CM', 'GLV-12-301-101-002', 'CMSEQ', '3', 'AECM1']] },
    quiz: [
      { q: 'What links a RELREC row to its record?', options: ['RELID alone', 'RDOMAIN, USUBJID and IDVAR/IDVARVAL', 'The row order', 'QNAM'], answer: 1, why: 'RDOMAIN names the domain; IDVAR (--SEQ) and IDVARVAL find the record of that subject.' },
      { q: 'Which code can a sponsor use for a custom domain?', options: ['ED', 'XE', 'EX', 'QS'], answer: 1, why: 'Codes beginning with X, Y or Z are reserved for sponsor-defined domains; EX and QS are standard.' },
    ] },
  { id: 'acrf', title: 'The annotated CRF',
    body: [
      'The aCRF shows reviewers where every collected field ends up in SDTM. It covers each unique CRF page once, with the domain at the top left of the page, bookmarks by visit and by form, and a linked table of contents.',
      'Annotations use the variable name alone when the page feeds one domain and DOMAIN.VARIABLE when it feeds several; findings are written as VSORRES when VSTESTCD = SYSBP; supplemental qualifiers as QVAL when QNAM = RACE1 in SUPPDM; fields collected but not submitted as [NOT SUBMITTED]. Each domain on a page has its own colour.',
      'Only collected data are annotated. Variables derived from a field (standard results, study days, AGE, VISITNUM, EPOCH) are not; their derivations are in define.xml. The origin in define.xml points to the aCRF page for every collected variable, so the two must agree.',
    ],
    quiz: [
      { q: 'The vital signs page collects systolic blood pressure. What is its annotation?', options: ['SYSBP', 'VSORRES when VSTESTCD = SYSBP', 'VS.SYSBP', 'VSSTRESN'], answer: 1, why: 'Findings are annotated as the result variable with the test code that identifies the record.' },
      { q: 'A field is collected but not used in any dataset. How is it annotated?', options: ['Left blank', '[NOT SUBMITTED]', 'SUPP--', 'NA'], answer: 1, why: 'Every field is annotated; unused ones say so.' },
    ] },
  { id: 'define', title: 'define.xml',
    body: [
      'define.xml is the metadata of the submission: each dataset with its class, structure and key variables; each variable with its label, type, length, controlled terms and origin; value-level metadata where a variable’s metadata depends on another variable (VSORRES for each VSTESTCD, QVAL for each QNAM); a method for every derivation; and links to the datasets, the aCRF and the reviewer’s guide. Version 2.1 adds def:Standards and splits the origin into a type and a source.',
      'Origins: Collected (with the source, Investigator or Vendor, and the aCRF page for CRF data), Derived (with a method), Assigned (set by the sponsor, such as dictionary coding or a test name printed on the CRF), Protocol (trial design) and Not Available. The origin of every collected variable must agree with the aCRF.',
      'Codelists list the terms the data use; a term a sponsor adds to an extensible codelist is marked as an extended value. A stylesheet turns define.xml into readable tables in a browser.',
    ],
    quiz: [
      { q: 'What is the origin of AEDECOD from the coding team’s export?', options: ['Collected', 'Derived', 'Assigned', 'Protocol'], answer: 2, why: 'Dictionary coding is assigned by the sponsor, not collected on the CRF.' },
      { q: 'Where does define.xml say how VSORRES is collected for systolic blood pressure?', options: ['In the codelist', 'In value-level metadata, with a where clause VSTESTCD = SYSBP', 'In a comment', 'Nowhere'], answer: 1, why: 'Value-level metadata gives metadata per test.' },
    ] },
  { id: 'csdrg', title: 'Validation and the reviewer’s guide',
    body: [
      'Before a package goes out, the datasets and define.xml are validated under the rules of the agency that will receive them. A validator groups its findings into issues: one per check, dataset and variable, with the number of records and subjects. The run report is kept with the delivery.',
      'Each issue is fixed or explained. Reject findings must be fixed: the agency’s gateway refuses the package. Findings that mean the mapping is wrong (a Required variable null, duplicate --SEQ) are fixed in the program, and define.xml findings are fixed in the metadata. An Error or Warning that is true of the data, such as an end date before a start date that the site confirmed in a query, is left as collected and explained.',
      'The explanation goes into the Clinical Study Data Reviewer’s Guide (cSDRG), written in the PHUSE template’s sections: introduction (purpose, acronyms, standards and dictionaries with versions, source data), protocol description, subject data description (the aCRF and a note for each domain that needs one), data conformance summary (the validation inputs and every issue not fixed, with its explanation) and an appendix with the inclusion and exclusion criteria.',
      'A good explanation says what the records show, why, and what was done: “AE end date precedes the start date for one event; the site confirmed both dates against the source in a query; the data are submitted as collected.” “Data issue” or “as per sponsor” tells a reviewer nothing. Explaining a finding that the mapping causes hides an error; in missions it still costs points.',
    ],
    quiz: [
      { q: 'A Reject finding remains in a dataset for an FDA submission. What do you do?', options: ['Explain it in the cSDRG', 'Fix it before the package goes out', 'Ignore it if fewer than 5 records', 'Move it to SUPP--'], answer: 1, why: 'Reject findings stop the package at the gateway; they cannot be explained.' },
      { q: 'One AE ends before it starts; the site confirmed both dates against the source. What goes into the cSDRG?', options: ['Nothing: change the end date', 'An explanation in the issues summary of the data conformance section', 'A note in define.xml only', 'A protocol deviation'], answer: 1, why: 'The data stay as collected, and the issue is explained in section 4 of the reviewer’s guide.' },
    ] },
  { id: 'pk', title: 'Pharmacokinetics: EX, PC and PP',
    body: [
      'In a PK study every concentration is timed from a dose, so the dose time in EX must be exact: EXSTDTC to the minute, from the dosing log. RFSTDTC carries the time of the first dose as well.',
      'PC has one record per sample result. Its timing variables say two things. Planned: PCTPT (PRE-DOSE, 2 H POST-DOSE), PCTPTNUM, PCELTM (the planned elapsed time as an ISO 8601 duration: PT2H, −PT15M) and PCTPTREF (the dose the time point refers to). Actual: PCDTC (when the sample was drawn) and PCRFTDTC (when the reference dose was taken). The actual elapsed time is PCDTC minus PCRFTDTC; analysis derives it, SDTM does not.',
      'VISIT is when the sample was drawn, which is not always the day of the dose: the 24 h sample of a Day 1 dose is drawn on Day 2. Results below the lower limit of quantitation are kept as reported (BLQ), with PCSTRESN null and PCLLOQ populated. A sample that was planned but not analysed stays as a record with PCSTAT = NOT DONE. Bioanalytical files can hold more than one run for a sample; only the reportable result goes to SDTM.',
      'PP holds the parameters calculated from the concentrations (Cmax, Tmax, AUC, half-life), coded with the PKPARMCD and PKPARM codelists, units from PKUNIT, and PPRFTDTC the dose of the profile. A parameter that could not be calculated is kept with PPSTAT = NOT DONE and the reason. RELREC relates the PP records of a profile to the PC records they came from; with --GRPID naming the profile, one RELREC record on each side stands for the whole group.',
    ],
    quiz: [
      { q: 'The 24 h sample after the Day 1 dose is drawn on Day 2. What are VISIT and PCTPTREF?', options: ['DAY 2 and DAY 2 DOSE', 'DAY 1 and DAY 1 DOSE', 'DAY 2 and DAY 1 DOSE', 'DAY 1 and DAY 2 DOSE'], answer: 2, why: 'VISIT is when it was drawn; PCTPTREF names the dose it is timed from.' },
      { q: 'A concentration is below the LLOQ of 1.00 ng/mL. What goes into PCSTRESN?', options: ['0', '0.5 (half the LLOQ)', 'Null; PCSTRESC keeps BLQ and PCLLOQ is 1', '1'], answer: 2, why: 'SDTM keeps what was reported; imputing values for BLQ is an analysis rule (ADaM), not SDTM.' },
      { q: 'What is PCELTM for a sample planned 30 minutes after the dose?', options: ['0.5', 'PT30M', '00:30', '30 MIN'], answer: 1, why: 'PCELTM is an ISO 8601 duration.' },
    ] },
  { id: 'onc', title: 'Oncology: TU, TR and RS by RECIST 1.1',
    body: [
      'Solid tumour studies assess response by RECIST 1.1. At baseline the investigator picks up to five target lesions (two per organ), measurable at 10 mm or more (lymph nodes at 15 mm short axis or more), and lists other disease as non-target lesions. Each assessment measures the targets, adds them up to the sum of diameters, judges the non-target lesions and looks for new lesions.',
      'TU identifies each lesion once per assessor: TUTESTCD TUMIDENT with TUORRES TARGET, NON-TARGET or NEW, its location, method and evaluator, and TULNKID, the lesion’s ID. TR holds every assessment of a lesion, linked by TRLNKID: the longest diameter (LDIAM), the short axis for a node (SAXIS), or the state of a non-target or new lesion (TUMSTATE), plus the sum of diameters (SUMDIAM). A lesion too small to measure is given 5 mm by RECIST 1.1; the collected text stays in TRORRES.',
      'RS holds the responses: target (TRGRESP), non-target (NTRGRESP), new lesion progression (NEWLPROG) and overall (OVRLRESP), one record per test per visit per assessor. A phase 3 study usually has two assessors: the investigator and a blinded independent central review; RSEVAL tells them apart. Each keeps its own judgement, and SDTM keeps both as collected.',
      'TR and RS are linked by a link group (--LNKGRP) naming the assessment; RELREC then relates the datasets as a whole: TU to TR by TULNKID and TRLNKID (ONE to MANY), TR to RS by the link groups (MANY to ONE), with USUBJID and IDVARVAL null. Deaths go to DD (the cause) and DM (DTHFL, DTHDTC); prior surgery and radiotherapy to PR. EPOCH separates treatment from follow-up, where scans go on after treatment stops.',
    ],
    quiz: [
      { q: 'A target lymph node measures 8 mm short axis. Which TRTESTCD?', options: ['LDIAM', 'SAXIS', 'TUMSTATE', 'SUMDIAM'], answer: 1, why: 'RECIST 1.1 measures lymph nodes by their short axis; below 10 mm a node counts as normal.' },
      { q: 'The investigator recorded PR; the measurements show a 26% decrease. What goes into RSORRES?', options: ['SD, recalculated', 'PR, as collected', 'NE', 'Nothing until the query is answered'], answer: 1, why: 'SDTM keeps the assessor’s judgement; the discrepancy is a data review question, and the independent review has its own record.' },
      { q: 'How is TU related to TR in RELREC?', options: ['Record by record through --SEQ', 'Dataset level through TULNKID and TRLNKID, ONE to MANY', 'Through VISITNUM', 'It is not related'], answer: 1, why: 'One lesion has many assessments; the link ID carries the relationship.' },
    ] },
  { id: 'send', title: 'SEND: the same model for nonclinical studies',
    body: [
      'SEND (the Standard for Exchange of Nonclinical Data) is SDTM applied to animal toxicology and safety pharmacology studies. Its implementation guide is SENDIG (v3.1.1 is the version FDA requires for studies started after March 2023). The FDA requires SEND for most IND and NDA nonclinical studies; the trainer’s ZEN-T-0428 study (a 4-week rat toxicity study, missions S31 to S33) is mapped to SENDIG v3.1.1 so you can practise it.',
      'What stays the same: the general observation classes, DOMAIN, --SEQ, --TESTCD and --ORRES, ISO 8601 dates, define.xml, the trial design idea, SUPP-- datasets and RELREC, and conformance checking before submission.',
      'What differs: the subjects are animals, identified by USUBJID with SPECIES and STRAIN in DM and the dose group in ARM; studies are designed by sets of animals (TX, trial sets, with SETCD on every animal in DM) rather than visits, and timing is by study day (--DY) and nominal day (--NOMDY) more than by visit. There are domains with no clinical counterpart: BW (body weights), BG (body weight gains), CL (clinical observations), FW (food and water), MA (macroscopic findings at necropsy), MI (microscopic histopathology), OM (organ measurements), TF (tumour findings), PM (palpable masses), and POOLDEF for pooled samples. LB, PC, PP, EX, DS and EG are shared.',
      'Pathology is coded in --STRESC with the SEND controlled terminology (NONNEO, NEOPLASM) and severity in --SEV; a finding of “unremarkable” is a record too, not a missing one. Nonclinical studies send data through the same gateway, with the same technical rejection criteria, and a reviewer’s guide of their own: the nSDRG.',
    ],
    quiz: [
      { q: 'Which dataset says which animals belong to which dose group in SEND?', options: ['TA', 'TX (trial sets), with SETCD in DM', 'SV', 'SUPPDM'], answer: 1, why: 'SEND designs studies by trial sets; each animal’s SETCD points to its set in TX.' },
      { q: 'Where do body weights go in SEND?', options: ['VS', 'BW', 'LB', 'CL'], answer: 1, why: 'SEND has its own BW domain (and BG for gains); VS in SEND is for vital signs.' },
      { q: 'A tissue examined under the microscope shows no findings. What is submitted?', options: ['Nothing', 'An MI record with the result UNREMARKABLE', 'A comment in CO', 'A record in MA'], answer: 1, why: 'Every tissue examined has a record; “unremarkable” is a result.' },
    ] },
  { id: 'tauas', title: 'Therapeutic areas: respiratory and vaccines',
    body: [
      'CDISC therapeutic area user guides (TAUGs) show how the SDTMIG domains carry the data of one disease area. Two of the trainer’s studies follow them: the asthma study AIR-09-202 (TAUG-Asthma) and the vaccine study ALV-3-301 (the Vaccines TAUG and the SDTMIG’s own vaccine examples).',
      'Respiratory: lung function tests go to RE (Respiratory System Findings), not LB or VS. A spirometry vendor sends every manoeuvre; only the reportable result of a session is submitted, one record per test (FEV1, FVC, FEV1/FVC, FEV1 % predicted), with RETPT for before and after a bronchodilator. Questionnaires go to QS: one record per item, the answer as collected in QSORRES and its score in QSSTRESC/QSSTRESN; a total the sponsor derives is a record with QSDRVFL Y and no QSORRES.',
      'Vaccines: the reactions a protocol asks about (solicited reactions) go to CE (Clinical Events) with CEPRESP Y, one record per reaction per dose whether it occurred or not (CEOCCUR Y or N), its worst severity, and when it started and ended. Each diary day’s grade or diameter goes to FA (Findings About) with FAOBJ naming the reaction. Diary temperatures go to VS; antibody titres to IS (Immunogenicity Specimen Assessments), with ISBDAGNT the antigen the antibodies bind. Unsolicited reactions are ordinary adverse events in AE.',
      'Time points tie it together: CETPTREF, FATPTREF and VSTPTREF name the dose (DOSE 1, DOSE 2) and --RFTDTC gives its date and time; FATPT DAY 1 to DAY 7 count from it. A day the participant did not complete is a NOT DONE record, not a missing one.',
    ],
    quiz: [
      { q: 'A participant had no headache after dose 1. What is in CE?', options: ['Nothing', 'A record with CEPRESP Y and CEOCCUR N', 'A record in AE', 'A record with CEOCCUR Y and CESEV NONE'], answer: 1, why: 'Solicited reactions are pre-specified: every one gets a record, and CEOCCUR says whether it occurred.' },
      { q: 'Where does the daily diameter of injection site redness go?', options: ['CE, one record per day', 'FA, with FATESTCD LDIAM and FAOBJ the reaction', 'VS', 'SUPPCE'], answer: 1, why: 'Findings about an event are FA records; FAOBJ ties them to the CE record’s term.' },
      { q: 'The spirometry vendor sends three manoeuvres and a BEST row per session. Which go to RE?', options: ['All four', 'The three manoeuvres', 'The BEST row: the reportable values', 'None: spirometry goes to LB'], answer: 2, why: 'Only the reportable result is submitted; single manoeuvres are the vendor’s raw data.' },
    ] },
  { id: 'tamore', title: 'Diabetes, cardiovascular and pain studies',
    body: [
      'Diabetes (INS-22-305): an insulin dose titrated every week is a series of constant-dosing intervals in EX, one record per dose with EXADJ saying why it changed. Participants’ own meter readings go to LB as capillary blood with the meter’s date and time and no visit. Hypoglycaemic episodes reported on their own page go to CE, with the protocol’s level, and are related to the reading taken during the episode with RELREC.',
      'Cardiovascular (CRD-31-401): a central ECG laboratory reads each tracing of a triplicate, one EG record per test per tracing with the CDISC test codes (EGHRMN, PRAG, QRSAG, QTAG, QTCFAG, INTP); the sponsor adds the mean of each triplicate as a derived record (EGDRVFL Y), which is the value analysed. Suspected events reported by sites go to CE; the clinical events committee’s decision about each is a finding about that event in FA, by the committee (FAEVAL), never written over what the investigator reported.',
      'Pain (PNR-18-203): daily diary ratings go to QS with the recall period in QSEVLINT (-P1D for the last 24 hours); a day not completed has no record, and weekly means are analysis values for ADaM, not SDTM. Rescue medicine from the diary goes to CM, one record per day taken, with the day’s total in CMDOSTOT.',
    ],
    quiz: [
      { q: 'A basal insulin dose goes from 10 to 12 units after a week. How many EX records cover those two weeks?', options: ['One, with the mean dose', 'Two, one per constant dose, the second with EXADJ TITRATION', 'Fourteen, one per day', 'One, with EXDOSTXT 10-12'], answer: 1, why: 'EX holds constant-dosing intervals; a change of dose starts a new record, and EXADJ gives the reason.' },
      { q: 'Where does the mean QTcF of a triplicate ECG go?', options: ['ADaM only', 'SUPPEG', 'An EG record with EGDRVFL Y', 'It replaces the three tracings'], answer: 2, why: 'The sponsor-derived mean is submitted as its own EG record flagged as derived; the tracings stay.' },
      { q: 'A participant misses a day of the pain diary. What does QS hold for that day?', options: ['Records with QSSTAT NOT DONE', 'Nothing: the diary created no entry', 'The mean of the days before and after', 'A record with QSORRES 0'], answer: 1, why: 'There is no collected data to map; imputing or creating records is analysis, not tabulation.' },
    ] },
  { id: 'v40', title: 'What changes in the SDTMIG v4.0 draft',
    body: [
      'CDISC put SDTM v3.0 and SDTMIG v4.0 out for public review from February to April 2026, with publication targeted for late 2026. FDA still requires SDTMIG v3.4; v4.0 will only be used for submissions once it is final and listed in the FDA and PMDA catalogues.',
      'The draft adds SUBJID to every general-class domain, retires --BLFL in favour of --LOBXFL, adds collected race and ethnicity (CRACE, CETHNIC) to DM, replaces SUPP-- datasets with non-standard variable datasets (NS--), and adds new domains.',
      'Switch the project to “SDTMIG v4.0 draft” on the Project tab to map against the draft. Check the final standard when it is published.',
    ],
    quiz: [
      { q: 'Which flag does the v4.0 draft retire?', options: ['--LOBXFL', '--BLFL', '--DRVFL', 'DTHFL'], answer: 1, why: 'The draft keeps --LOBXFL as the pre-treatment flag and retires --BLFL.' },
    ] },
]
