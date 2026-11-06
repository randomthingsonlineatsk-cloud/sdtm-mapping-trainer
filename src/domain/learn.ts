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
      'Partial dates are truncated from the right: an unknown day is 2026-03, an unknown month and day is 2026. Never invent the missing part (2026-03-01) and never write placeholders such as UN or UNK.',
      'The time is kept only when it was collected. A date without a time stays a date: there is no T00:00.',
    ],
    example: { caption: 'From the raw form to --DTC', head: ['Raw date', 'Raw time', '--DTC'], rows: [['2026-03-10', '09:00', '2026-03-10T09:00'], ['2026-03-10', '', '2026-03-10'], ['2026-03 (day unknown)', '', '2026-03'], ['2026 (only the year)', '', '2026']] },
    quiz: [
      { q: 'A start date is known only as March 2026. What is --STDTC?', options: ['2026-03-01', '2026-03-UN', '2026-03', '03/2026'], answer: 2, why: 'Truncate the unknown part; never impute in SDTM.' },
      { q: 'A visit date was collected without a time. What is VSDTC?', options: ['2026-02-07T00:00', '2026-02-07', '2026-02-07T', '2026-02-07T12:00'], answer: 1, why: 'Only collected precision is submitted.' },
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
