// Standards metadata: SDTM v2.0 with SDTMIG v3.4 (the version FDA requires for studies starting
// on or after 15 March 2025), and an "SDTMIG v4.0 draft" mode built from the public-review draft
// (February to April 2026). Variable names, labels, types, roles and core status follow the
// published implementation guide for the domains this trainer maps; the domain list covers the
// whole guide so learners can browse it. CDISC publishes these standards openly.

// 'send' is the SEND implementation guide (SENDIG v3.1.1) for the nonclinical study: the same
// model applied to animal studies, with its own domains and its own versions of DM and EX.
export type Version = '3.4' | '4.0d' | 'send'
export const VERSION_LABEL: Record<Version, string> = { '3.4': 'SDTM v2.0 · SDTMIG v3.4', '4.0d': 'SDTM v3.0 · SDTMIG v4.0 draft (public review, 2026)', send: 'SENDIG v3.1.1 (nonclinical)' }
// Supplemental qualifiers: SUPP-- in SDTMIG v3.4 and in SENDIG; NS-- datasets in the v4.0 draft.
export const usesSupp = (ver: Version) => ver !== '4.0d'
export const isSend = (ver: Version) => ver === 'send'

export type Cls = 'Special-Purpose' | 'Interventions' | 'Events' | 'Findings' | 'Findings About' | 'Trial Design' | 'Relationship' | 'Study Reference'
export interface DomainInfo { code: string; name: string; cls: Cls; structure?: string; detail?: boolean }

export const DOMAINS: DomainInfo[] = [
  { code: 'CO', name: 'Comments', cls: 'Special-Purpose', structure: 'One record per comment per subject', detail: true },
  { code: 'DM', name: 'Demographics', cls: 'Special-Purpose', structure: 'One record per subject', detail: true },
  { code: 'SE', name: 'Subject Elements', cls: 'Special-Purpose', structure: 'One record per actual Element per subject' },
  { code: 'SM', name: 'Subject Disease Milestones', cls: 'Special-Purpose' },
  { code: 'SV', name: 'Subject Visits', cls: 'Special-Purpose', structure: 'One record per actual or planned visit per subject', detail: true },
  { code: 'AG', name: 'Procedure Agents', cls: 'Interventions' },
  { code: 'CM', name: 'Concomitant/Prior Medications', cls: 'Interventions', structure: 'One record per recorded intervention occurrence or constant-dosing interval per subject', detail: true },
  { code: 'EC', name: 'Exposure as Collected', cls: 'Interventions', structure: 'One record per protocol-specified study treatment, collected-dosing interval, per subject, per mood', detail: true },
  { code: 'EX', name: 'Exposure', cls: 'Interventions', structure: 'One record per protocol-specified study treatment, constant-dosing interval, per subject', detail: true },
  { code: 'ML', name: 'Meal Data', cls: 'Interventions' },
  { code: 'PR', name: 'Procedures', cls: 'Interventions', structure: 'One record per recorded procedure per occurrence per subject', detail: true },
  { code: 'SU', name: 'Substance Use', cls: 'Interventions' },
  { code: 'AE', name: 'Adverse Events', cls: 'Events', structure: 'One record per adverse event per subject', detail: true },
  { code: 'BE', name: 'Biospecimen Events', cls: 'Events' },
  { code: 'CE', name: 'Clinical Events', cls: 'Events', structure: 'One record per event per subject', detail: true },
  { code: 'DS', name: 'Disposition', cls: 'Events', structure: 'One record per disposition status or protocol milestone per subject', detail: true },
  { code: 'DV', name: 'Protocol Deviations', cls: 'Events', structure: 'One record per protocol deviation per subject', detail: true },
  { code: 'HO', name: 'Healthcare Encounters', cls: 'Events' },
  { code: 'MH', name: 'Medical History', cls: 'Events', structure: 'One record per medical history event per subject', detail: true },
  { code: 'BS', name: 'Biospecimen Findings', cls: 'Findings' },
  { code: 'CP', name: 'Cell Phenotype Findings', cls: 'Findings' },
  { code: 'CV', name: 'Cardiovascular System Findings', cls: 'Findings' },
  { code: 'DA', name: 'Product Accountability', cls: 'Findings' },
  { code: 'DD', name: 'Death Details', cls: 'Findings', structure: 'One record per finding per subject', detail: true },
  { code: 'EG', name: 'ECG Test Results', cls: 'Findings', structure: 'One record per ECG observation per replicate per time point or one record per ECG observation per beat per visit per subject', detail: true },
  { code: 'FT', name: 'Functional Tests', cls: 'Findings' },
  { code: 'GF', name: 'Genomics Findings', cls: 'Findings' },
  { code: 'IE', name: 'Inclusion/Exclusion Criteria Not Met', cls: 'Findings', structure: 'One record per inclusion/exclusion criterion not met per subject', detail: true },
  { code: 'IS', name: 'Immunogenicity Specimen Assessments', cls: 'Findings', structure: 'One record per test per visit per subject', detail: true },
  { code: 'LB', name: 'Laboratory Test Results', cls: 'Findings' },
  { code: 'MB', name: 'Microbiology Specimen', cls: 'Findings' },
  { code: 'MI', name: 'Microscopic Findings', cls: 'Findings' },
  { code: 'MK', name: 'Musculoskeletal System Findings', cls: 'Findings' },
  { code: 'MS', name: 'Microbiology Susceptibility', cls: 'Findings' },
  { code: 'NV', name: 'Nervous System Findings', cls: 'Findings' },
  { code: 'OE', name: 'Ophthalmic Examinations', cls: 'Findings' },
  { code: 'PC', name: 'Pharmacokinetics Concentrations', cls: 'Findings', structure: 'One record per sample characteristic or time-point concentration per reference time point or per analyte per subject', detail: true },
  { code: 'PE', name: 'Physical Examination', cls: 'Findings' },
  { code: 'PP', name: 'Pharmacokinetics Parameters', cls: 'Findings', structure: 'One record per PK parameter per time-concentration profile per modeling method per subject', detail: true },
  { code: 'QS', name: 'Questionnaires', cls: 'Findings', structure: 'One record per questionnaire per question per time point per visit per subject', detail: true },
  { code: 'RE', name: 'Respiratory System Findings', cls: 'Findings', structure: 'One record per finding or result per time point per visit per subject', detail: true },
  { code: 'RP', name: 'Reproductive System Findings', cls: 'Findings' },
  { code: 'RS', name: 'Disease Response and Clin Classification', cls: 'Findings', structure: 'One record per response assessment per time point per visit per subject per assessor per medical evaluator', detail: true },
  { code: 'SC', name: 'Subject Characteristics', cls: 'Findings' },
  { code: 'SS', name: 'Subject Status', cls: 'Findings' },
  { code: 'TR', name: 'Tumor/Lesion Results', cls: 'Findings', structure: 'One record per tumor measurement/assessment per visit per subject per assessor', detail: true },
  { code: 'TU', name: 'Tumor/Lesion Identification', cls: 'Findings', structure: 'One record per identified tumor per subject per assessor', detail: true },
  { code: 'UR', name: 'Urinary System Findings', cls: 'Findings' },
  { code: 'VS', name: 'Vital Signs', cls: 'Findings', structure: 'One record per vital sign measurement per time point per visit per subject', detail: true },
  { code: 'FA', name: 'Findings About Events or Interventions', cls: 'Findings About', structure: 'One record per finding, per object, per time point, per visit per subject', detail: true },
  { code: 'SR', name: 'Skin Response', cls: 'Findings About' },
  { code: 'TA', name: 'Trial Arms', cls: 'Trial Design' },
  { code: 'TD', name: 'Trial Disease Assessments', cls: 'Trial Design' },
  { code: 'TE', name: 'Trial Elements', cls: 'Trial Design' },
  { code: 'TI', name: 'Trial Inclusion/Exclusion Criteria', cls: 'Trial Design' },
  { code: 'TM', name: 'Trial Disease Milestones', cls: 'Trial Design' },
  { code: 'TS', name: 'Trial Summary', cls: 'Trial Design' },
  { code: 'TV', name: 'Trial Visits', cls: 'Trial Design' },
  { code: 'RELREC', name: 'Related Records', cls: 'Relationship' },
  { code: 'RELSPEC', name: 'Related Specimens', cls: 'Relationship' },
  { code: 'RELSUB', name: 'Related Subjects', cls: 'Relationship' },
  { code: 'SUPPQUAL', name: 'Supplemental Qualifiers (SUPP--)', cls: 'Relationship' },
  { code: 'OI', name: 'Non-host Organism Identifiers', cls: 'Study Reference' },
]

// SENDIG v3.1.1 domains used by the trainer's nonclinical study (the guide has more: LB, PC, PP,
// MA, TF, DS, PM, EG, CV, RE, BG, FW, SC, PP and the trial design datasets).
export const SEND_DOMAINS: DomainInfo[] = [
  { code: 'DM', name: 'Demographics (SEND)', cls: 'Special-Purpose', structure: 'One record per subject (animal)', detail: true },
  { code: 'EX', name: 'Exposure (SEND)', cls: 'Interventions', structure: 'One record per constant dosing interval per treatment per subject or pool', detail: true },
  { code: 'BW', name: 'Body Weights', cls: 'Findings', structure: 'One record per test per observation time per subject', detail: true },
  { code: 'CL', name: 'Clinical Observations', cls: 'Findings', structure: 'One record per observation per time point per subject or pool', detail: true },
  { code: 'MI', name: 'Microscopic Findings', cls: 'Findings', structure: 'One record per finding per specimen per subject', detail: true },
  { code: 'OM', name: 'Organ Measurements', cls: 'Findings', structure: 'One record per test per specimen per subject', detail: true },
  { code: 'TX', name: 'Trial Sets', cls: 'Trial Design', structure: 'One record per trial set parameter per trial set', detail: true },
]

export type Core = 'Req' | 'Exp' | 'Perm'
export type Role = 'Identifier' | 'Topic' | 'Grouping Qualifier' | 'Result Qualifier' | 'Synonym Qualifier' | 'Record Qualifier' | 'Variable Qualifier' | 'Timing' | 'Rule'
export interface VarMeta { name: string; label: string; type: 'Char' | 'Num'; role: Role; core: Core; ct?: string; note?: string; draft?: boolean }

const v = (name: string, label: string, type: 'Char' | 'Num', role: Role, core: Core, ct?: string): VarMeta => ({ name, label, type, role, core, ...(ct ? { ct } : {}) })
const ids = (d: string): VarMeta[] => [v('STUDYID', 'Study Identifier', 'Char', 'Identifier', 'Req'), v('DOMAIN', 'Domain Abbreviation', 'Char', 'Identifier', 'Req', 'DOMAIN'), v('USUBJID', 'Unique Subject Identifier', 'Char', 'Identifier', 'Req'), v(`${d}SEQ`, 'Sequence Number', 'Num', 'Identifier', 'Req')]

const META_34: Record<string, VarMeta[]> = {
  RE: [
    ...ids('RE'), v('REGRPID', 'Group ID', 'Char', 'Identifier', 'Perm'), v('RESPID', 'Sponsor-Defined Identifier', 'Char', 'Identifier', 'Perm'),
    v('RETESTCD', 'Short Name of Respiratory Test', 'Char', 'Topic', 'Req', 'RETESTCD'), v('RETEST', 'Name of Respiratory Test', 'Char', 'Synonym Qualifier', 'Req', 'RETEST'),
    v('RECAT', 'Category for Respiratory Test', 'Char', 'Grouping Qualifier', 'Perm'), v('RESCAT', 'Subcategory for Respiratory Test', 'Char', 'Grouping Qualifier', 'Perm'), v('REPOS', 'Position of Subject', 'Char', 'Record Qualifier', 'Perm'),
    v('REORRES', 'Result or Finding in Original Units', 'Char', 'Result Qualifier', 'Exp'), v('REORRESU', 'Original Units', 'Char', 'Variable Qualifier', 'Exp', 'UNIT'),
    v('RESTRESC', 'Character Result/Finding in Std Format', 'Char', 'Result Qualifier', 'Exp'), v('RESTRESN', 'Numeric Result/Finding in Standard Units', 'Num', 'Result Qualifier', 'Exp'), v('RESTRESU', 'Standard Units', 'Char', 'Variable Qualifier', 'Exp', 'UNIT'),
    v('RESTAT', 'Completion Status', 'Char', 'Record Qualifier', 'Perm', 'ND'), v('REREASND', 'Reason Not Performed', 'Char', 'Record Qualifier', 'Perm'),
    v('RENAM', 'Vendor Name', 'Char', 'Record Qualifier', 'Perm'), v('RELOBXFL', 'Last Observation Before Exposure Flag', 'Char', 'Record Qualifier', 'Exp', 'NY'),
    v('VISITNUM', 'Visit Number', 'Num', 'Timing', 'Exp'), v('VISIT', 'Visit Name', 'Char', 'Timing', 'Perm'), v('EPOCH', 'Epoch', 'Char', 'Timing', 'Perm', 'EPOCH'),
    v('REDTC', 'Date/Time of Test', 'Char', 'Timing', 'Exp'), v('REDY', 'Study Day of Test', 'Num', 'Timing', 'Perm'),
    v('RETPT', 'Planned Time Point Name', 'Char', 'Timing', 'Perm'), v('RETPTNUM', 'Planned Time Point Number', 'Num', 'Timing', 'Perm'),
  ],
  EG: [
    ...ids('EG'), v('EGGRPID', 'Group ID', 'Char', 'Identifier', 'Perm'), v('EGREFID', 'ECG Reference ID', 'Char', 'Identifier', 'Perm'), v('EGSPID', 'Sponsor-Defined Identifier', 'Char', 'Identifier', 'Perm'),
    v('EGTESTCD', 'ECG Test or Examination Short Name', 'Char', 'Topic', 'Req', 'EGTESTCD'), v('EGTEST', 'ECG Test or Examination Name', 'Char', 'Synonym Qualifier', 'Req', 'EGTEST'),
    v('EGCAT', 'Category for ECG', 'Char', 'Grouping Qualifier', 'Perm'), v('EGPOS', 'ECG Position of Subject', 'Char', 'Record Qualifier', 'Perm', 'POSITION'),
    v('EGORRES', 'Result or Finding in Original Units', 'Char', 'Result Qualifier', 'Exp'), v('EGORRESU', 'Original Units', 'Char', 'Variable Qualifier', 'Perm', 'UNIT'),
    v('EGSTRESC', 'Character Result/Finding in Std Format', 'Char', 'Result Qualifier', 'Exp'), v('EGSTRESN', 'Numeric Result/Finding in Standard Units', 'Num', 'Result Qualifier', 'Perm'), v('EGSTRESU', 'Standard Units', 'Char', 'Variable Qualifier', 'Perm', 'UNIT'),
    v('EGSTAT', 'Completion Status', 'Char', 'Record Qualifier', 'Perm', 'ND'), v('EGREASND', 'Reason ECG Not Done', 'Char', 'Record Qualifier', 'Perm'),
    v('EGNAM', 'Vendor Name', 'Char', 'Record Qualifier', 'Perm'), v('EGMETHOD', 'Method of Test or Examination', 'Char', 'Record Qualifier', 'Perm', 'EGMETHOD'),
    v('EGLOBXFL', 'Last Observation Before Exposure Flag', 'Char', 'Record Qualifier', 'Exp', 'NY'), v('EGBLFL', 'Baseline Flag', 'Char', 'Record Qualifier', 'Perm', 'NY'),
    v('EGEVAL', 'Evaluator', 'Char', 'Record Qualifier', 'Perm'), v('EGDRVFL', 'Derived Flag', 'Char', 'Record Qualifier', 'Perm', 'NY'),
    v('VISITNUM', 'Visit Number', 'Num', 'Timing', 'Exp'), v('VISIT', 'Visit Name', 'Char', 'Timing', 'Perm'), v('EPOCH', 'Epoch', 'Char', 'Timing', 'Perm', 'EPOCH'),
    v('EGDTC', 'Date/Time of ECG', 'Char', 'Timing', 'Exp'), v('EGDY', 'Study Day of ECG', 'Num', 'Timing', 'Perm'),
    v('EGTPT', 'Planned Time Point Name', 'Char', 'Timing', 'Perm'), v('EGTPTNUM', 'Planned Time Point Number', 'Num', 'Timing', 'Perm'), v('EGTPTREF', 'Time Point Reference', 'Char', 'Timing', 'Perm'),
  ],
  QS: [
    ...ids('QS'), v('QSGRPID', 'Group ID', 'Char', 'Identifier', 'Perm'), v('QSSPID', 'Sponsor-Defined Identifier', 'Char', 'Identifier', 'Perm'),
    v('QSTESTCD', 'Question Short Name', 'Char', 'Topic', 'Req'), v('QSTEST', 'Question Name', 'Char', 'Synonym Qualifier', 'Req'),
    v('QSCAT', 'Category of Question', 'Char', 'Grouping Qualifier', 'Req'), v('QSSCAT', 'Subcategory for Question', 'Char', 'Grouping Qualifier', 'Perm'),
    v('QSORRES', 'Finding in Original Units', 'Char', 'Result Qualifier', 'Exp'), v('QSORRESU', 'Original Units', 'Char', 'Variable Qualifier', 'Perm', 'UNIT'),
    v('QSSTRESC', 'Character Result/Finding in Std Format', 'Char', 'Result Qualifier', 'Exp'), v('QSSTRESN', 'Numeric Finding in Standard Units', 'Num', 'Result Qualifier', 'Exp'), v('QSSTRESU', 'Standard Units', 'Char', 'Variable Qualifier', 'Perm', 'UNIT'),
    v('QSSTAT', 'Completion Status', 'Char', 'Record Qualifier', 'Perm', 'ND'), v('QSREASND', 'Reason Not Performed', 'Char', 'Record Qualifier', 'Perm'),
    v('QSDRVFL', 'Derived Flag', 'Char', 'Record Qualifier', 'Perm', 'NY'), v('QSLOBXFL', 'Last Observation Before Exposure Flag', 'Char', 'Record Qualifier', 'Exp', 'NY'), v('QSEVAL', 'Evaluator', 'Char', 'Record Qualifier', 'Perm', 'EVAL'),
    v('VISITNUM', 'Visit Number', 'Num', 'Timing', 'Exp'), v('VISIT', 'Visit Name', 'Char', 'Timing', 'Perm'), v('EPOCH', 'Epoch', 'Char', 'Timing', 'Perm', 'EPOCH'),
    v('QSDTC', 'Date/Time of Finding', 'Char', 'Timing', 'Exp'), v('QSDY', 'Study Day of Finding', 'Num', 'Timing', 'Perm'), v('QSEVLINT', 'Evaluation Interval', 'Char', 'Timing', 'Perm'),
  ],
  CE: [
    ...ids('CE'), v('CEGRPID', 'Group ID', 'Char', 'Identifier', 'Perm'), v('CESPID', 'Sponsor-Defined Identifier', 'Char', 'Identifier', 'Perm'), v('CELNKID', 'Link ID', 'Char', 'Identifier', 'Perm'),
    v('CETERM', 'Reported Term for the Clinical Event', 'Char', 'Topic', 'Req'), v('CEDECOD', 'Dictionary-Derived Term', 'Char', 'Synonym Qualifier', 'Perm'),
    v('CECAT', 'Category for Clinical Event', 'Char', 'Grouping Qualifier', 'Perm'), v('CESCAT', 'Subcategory for Clinical Event', 'Char', 'Grouping Qualifier', 'Perm'),
    v('CEPRESP', 'Clinical Event Pre-specified', 'Char', 'Variable Qualifier', 'Perm', 'NY'), v('CEOCCUR', 'Clinical Event Occurrence', 'Char', 'Record Qualifier', 'Perm', 'NY'),
    v('CESTAT', 'Completion Status', 'Char', 'Record Qualifier', 'Perm', 'ND'), v('CEREASND', 'Reason Clinical Event Not Collected', 'Char', 'Record Qualifier', 'Perm'),
    v('CELOC', 'Location of Event', 'Char', 'Record Qualifier', 'Perm', 'LOC'), v('CELAT', 'Laterality', 'Char', 'Variable Qualifier', 'Perm', 'LAT'), v('CESEV', 'Severity/Intensity', 'Char', 'Record Qualifier', 'Perm', 'AESEV'),
    v('EPOCH', 'Epoch', 'Char', 'Timing', 'Perm', 'EPOCH'), v('CESTDTC', 'Start Date/Time of Clinical Event', 'Char', 'Timing', 'Perm'), v('CEENDTC', 'End Date/Time of Clinical Event', 'Char', 'Timing', 'Perm'),
    v('CESTDY', 'Study Day of Start of Event', 'Num', 'Timing', 'Perm'), v('CEENDY', 'Study Day of End of Event', 'Num', 'Timing', 'Perm'),
    v('CETPTREF', 'Time Point Reference', 'Char', 'Timing', 'Perm'), v('CERFTDTC', 'Date/Time of Reference Time Point', 'Char', 'Timing', 'Perm'), v('CEEVINTX', 'Evaluation Interval Text', 'Char', 'Timing', 'Perm'),
  ],
  FA: [
    ...ids('FA'), v('FAGRPID', 'Group ID', 'Char', 'Identifier', 'Perm'), v('FASPID', 'Sponsor-Defined Identifier', 'Char', 'Identifier', 'Perm'), v('FALNKID', 'Link ID', 'Char', 'Identifier', 'Perm'),
    v('FATESTCD', 'Findings About Test Short Name', 'Char', 'Topic', 'Req', 'FATESTCD'), v('FATEST', 'Findings About Test Name', 'Char', 'Synonym Qualifier', 'Req', 'FATEST'),
    v('FAOBJ', 'Object of the Observation', 'Char', 'Synonym Qualifier', 'Req'), v('FACAT', 'Category for Findings About', 'Char', 'Grouping Qualifier', 'Perm'), v('FASCAT', 'Subcategory for Findings About', 'Char', 'Grouping Qualifier', 'Perm'),
    v('FAORRES', 'Result or Finding in Original Units', 'Char', 'Result Qualifier', 'Exp'), v('FAORRESU', 'Original Units', 'Char', 'Variable Qualifier', 'Perm', 'UNIT'),
    v('FASTRESC', 'Character Result/Finding in Std Format', 'Char', 'Result Qualifier', 'Exp'), v('FASTRESN', 'Numeric Result/Finding in Standard Units', 'Num', 'Result Qualifier', 'Perm'), v('FASTRESU', 'Standard Units', 'Char', 'Variable Qualifier', 'Perm', 'UNIT'),
    v('FASTAT', 'Completion Status', 'Char', 'Record Qualifier', 'Perm', 'ND'), v('FAREASND', 'Reason Not Performed', 'Char', 'Record Qualifier', 'Perm'),
    v('FALOC', 'Location of the Finding About', 'Char', 'Record Qualifier', 'Perm', 'LOC'), v('FALAT', 'Laterality', 'Char', 'Variable Qualifier', 'Perm', 'LAT'), v('FAEVAL', 'Evaluator', 'Char', 'Record Qualifier', 'Perm', 'EVAL'),
    v('VISITNUM', 'Visit Number', 'Num', 'Timing', 'Exp'), v('VISIT', 'Visit Name', 'Char', 'Timing', 'Perm'), v('EPOCH', 'Epoch', 'Char', 'Timing', 'Perm', 'EPOCH'),
    v('FADTC', 'Date/Time of Collection', 'Char', 'Timing', 'Perm'), v('FADY', 'Study Day of Collection', 'Num', 'Timing', 'Perm'),
    v('FATPT', 'Planned Time Point Name', 'Char', 'Timing', 'Perm'), v('FATPTNUM', 'Planned Time Point Number', 'Num', 'Timing', 'Perm'),
    v('FATPTREF', 'Time Point Reference', 'Char', 'Timing', 'Perm'), v('FARFTDTC', 'Date/Time of Reference Time Point', 'Char', 'Timing', 'Perm'),
  ],
  IS: [
    ...ids('IS'), v('ISGRPID', 'Group ID', 'Char', 'Identifier', 'Perm'), v('ISREFID', 'Reference ID', 'Char', 'Identifier', 'Perm'), v('ISSPID', 'Sponsor-Defined Identifier', 'Char', 'Identifier', 'Perm'),
    v('ISTESTCD', 'Immunogenicity Test/Exam Short Name', 'Char', 'Topic', 'Req'), v('ISTEST', 'Immunogenicity Test or Examination Name', 'Char', 'Synonym Qualifier', 'Req'),
    v('ISCAT', 'Category for Immunogenicity Test', 'Char', 'Grouping Qualifier', 'Perm'), v('ISBDAGNT', 'Binding Agent', 'Char', 'Record Qualifier', 'Perm'),
    v('ISORRES', 'Result or Finding in Original Units', 'Char', 'Result Qualifier', 'Exp'), v('ISORRESU', 'Original Units', 'Char', 'Variable Qualifier', 'Exp', 'UNIT'),
    v('ISSTRESC', 'Character Result/Finding in Std Format', 'Char', 'Result Qualifier', 'Exp'), v('ISSTRESN', 'Numeric Result/Finding in Standard Units', 'Num', 'Result Qualifier', 'Exp'), v('ISSTRESU', 'Standard Units', 'Char', 'Variable Qualifier', 'Exp', 'UNIT'),
    v('ISSTAT', 'Completion Status', 'Char', 'Record Qualifier', 'Perm', 'ND'), v('ISREASND', 'Reason Test Not Done', 'Char', 'Record Qualifier', 'Perm'),
    v('ISNAM', 'Vendor Name', 'Char', 'Record Qualifier', 'Perm'), v('ISSPEC', 'Specimen Type', 'Char', 'Record Qualifier', 'Perm', 'SPECTYPE'), v('ISMETHOD', 'Method of Test or Examination', 'Char', 'Record Qualifier', 'Perm'),
    v('ISLLOQ', 'Lower Limit of Quantitation', 'Num', 'Variable Qualifier', 'Perm'), v('ISLOBXFL', 'Last Observation Before Exposure Flag', 'Char', 'Record Qualifier', 'Exp', 'NY'),
    v('VISITNUM', 'Visit Number', 'Num', 'Timing', 'Exp'), v('VISIT', 'Visit Name', 'Char', 'Timing', 'Perm'), v('EPOCH', 'Epoch', 'Char', 'Timing', 'Perm', 'EPOCH'),
    v('ISDTC', 'Date/Time of Collection', 'Char', 'Timing', 'Exp'), v('ISDY', 'Study Day of Visit/Collection/Exam', 'Num', 'Timing', 'Perm'),
  ],
  TU: [
    ...ids('TU'), v('TUGRPID', 'Group ID', 'Char', 'Identifier', 'Perm'), v('TUREFID', 'Reference ID', 'Char', 'Identifier', 'Perm'), v('TUSPID', 'Sponsor-Defined Identifier', 'Char', 'Identifier', 'Perm'),
    v('TULNKID', 'Link ID', 'Char', 'Identifier', 'Exp'), v('TULNKGRP', 'Link Group ID', 'Char', 'Identifier', 'Perm'),
    v('TUTESTCD', 'Tumor/Lesion ID Short Name', 'Char', 'Topic', 'Req', 'TUTESTCD'), v('TUTEST', 'Tumor/Lesion ID Test Name', 'Char', 'Synonym Qualifier', 'Req', 'TUTEST'),
    v('TUORRES', 'Tumor/Lesion ID Result', 'Char', 'Result Qualifier', 'Exp'), v('TUSTRESC', 'Tumor/Lesion ID Result Std. Format', 'Char', 'Result Qualifier', 'Exp', 'TUIDRS'),
    v('TUNAM', 'Laboratory/Vendor Name', 'Char', 'Record Qualifier', 'Perm'), v('TULOC', 'Location of the Tumor/Lesion', 'Char', 'Record Qualifier', 'Exp', 'LOC'), v('TULAT', 'Laterality', 'Char', 'Variable Qualifier', 'Perm', 'LAT'),
    v('TUMETHOD', 'Method of Identification', 'Char', 'Record Qualifier', 'Exp', 'METHOD'), v('TUEVAL', 'Evaluator', 'Char', 'Record Qualifier', 'Perm', 'EVAL'), v('TUEVALID', 'Evaluator Identifier', 'Char', 'Variable Qualifier', 'Perm'),
    v('TUACPTFL', 'Accepted Record Flag', 'Char', 'Record Qualifier', 'Perm', 'NY'),
    v('VISITNUM', 'Visit Number', 'Num', 'Timing', 'Exp'), v('VISIT', 'Visit Name', 'Char', 'Timing', 'Perm'), v('EPOCH', 'Epoch', 'Char', 'Timing', 'Perm', 'EPOCH'),
    v('TUDTC', 'Date/Time of Tumor/Lesion Identification', 'Char', 'Timing', 'Exp'), v('TUDY', 'Study Day of Tumor/Lesion Identification', 'Num', 'Timing', 'Perm'),
  ],
  TR: [
    ...ids('TR'), v('TRGRPID', 'Group ID', 'Char', 'Identifier', 'Perm'), v('TRREFID', 'Reference ID', 'Char', 'Identifier', 'Perm'), v('TRSPID', 'Sponsor-Defined Identifier', 'Char', 'Identifier', 'Perm'),
    v('TRLNKID', 'Link ID', 'Char', 'Identifier', 'Exp'), v('TRLNKGRP', 'Link Group ID', 'Char', 'Identifier', 'Perm'),
    v('TRTESTCD', 'Tumor/Lesion Assessment Short Name', 'Char', 'Topic', 'Req', 'TRTESTCD'), v('TRTEST', 'Tumor/Lesion Assessment Test Name', 'Char', 'Synonym Qualifier', 'Req', 'TRTEST'),
    v('TRORRES', 'Result or Finding in Original Units', 'Char', 'Result Qualifier', 'Exp'), v('TRORRESU', 'Original Units', 'Char', 'Variable Qualifier', 'Exp', 'UNIT'),
    v('TRSTRESC', 'Character Result/Finding in Std Format', 'Char', 'Result Qualifier', 'Exp'), v('TRSTRESN', 'Numeric Result/Finding in Standard Units', 'Num', 'Result Qualifier', 'Exp'), v('TRSTRESU', 'Standard Units', 'Char', 'Variable Qualifier', 'Exp', 'UNIT'),
    v('TRSTAT', 'Completion Status', 'Char', 'Record Qualifier', 'Perm', 'ND'), v('TRREASND', 'Reason Assessment Not Performed', 'Char', 'Record Qualifier', 'Perm'),
    v('TRNAM', 'Laboratory/Vendor Name', 'Char', 'Record Qualifier', 'Perm'), v('TRMETHOD', 'Method Used to Identify the Tumor/Lesion', 'Char', 'Record Qualifier', 'Exp', 'METHOD'),
    v('TREVAL', 'Evaluator', 'Char', 'Record Qualifier', 'Perm', 'EVAL'), v('TREVALID', 'Evaluator Identifier', 'Char', 'Variable Qualifier', 'Perm'), v('TRACPTFL', 'Accepted Record Flag', 'Char', 'Record Qualifier', 'Perm', 'NY'),
    v('VISITNUM', 'Visit Number', 'Num', 'Timing', 'Exp'), v('VISIT', 'Visit Name', 'Char', 'Timing', 'Perm'), v('EPOCH', 'Epoch', 'Char', 'Timing', 'Perm', 'EPOCH'),
    v('TRDTC', 'Date/Time of Tumor/Lesion Measurement', 'Char', 'Timing', 'Exp'), v('TRDY', 'Study Day of Tumor/Lesion Measurement', 'Num', 'Timing', 'Perm'),
  ],
  RS: [
    ...ids('RS'), v('RSGRPID', 'Group ID', 'Char', 'Identifier', 'Perm'), v('RSREFID', 'Reference ID', 'Char', 'Identifier', 'Perm'), v('RSSPID', 'Sponsor-Defined Identifier', 'Char', 'Identifier', 'Perm'),
    v('RSLNKID', 'Link ID', 'Char', 'Identifier', 'Perm'), v('RSLNKGRP', 'Link Group ID', 'Char', 'Identifier', 'Perm'),
    v('RSTESTCD', 'Assessment Short Name', 'Char', 'Topic', 'Req', 'ONCRTSCD'), v('RSTEST', 'Assessment Name', 'Char', 'Synonym Qualifier', 'Req', 'ONCRTS'),
    v('RSCAT', 'Category for Assessment', 'Char', 'Grouping Qualifier', 'Exp'), v('RSSCAT', 'Subcategory for Assessment', 'Char', 'Grouping Qualifier', 'Perm'),
    v('RSORRES', 'Result or Finding in Original Units', 'Char', 'Result Qualifier', 'Exp'), v('RSORRESU', 'Original Units', 'Char', 'Variable Qualifier', 'Perm', 'UNIT'),
    v('RSSTRESC', 'Character Result/Finding in Std Format', 'Char', 'Result Qualifier', 'Exp', 'ONCRSR'), v('RSSTRESN', 'Numeric Result/Finding in Standard Units', 'Num', 'Result Qualifier', 'Perm'), v('RSSTRESU', 'Standard Units', 'Char', 'Variable Qualifier', 'Perm', 'UNIT'),
    v('RSSTAT', 'Completion Status', 'Char', 'Record Qualifier', 'Perm', 'ND'), v('RSREASND', 'Reason Assessment Not Performed', 'Char', 'Record Qualifier', 'Perm'),
    v('RSNAM', 'Vendor Name', 'Char', 'Record Qualifier', 'Perm'), v('RSEVAL', 'Evaluator', 'Char', 'Record Qualifier', 'Exp', 'EVAL'), v('RSEVALID', 'Evaluator Identifier', 'Char', 'Variable Qualifier', 'Perm'),
    v('RSACPTFL', 'Accepted Record Flag', 'Char', 'Record Qualifier', 'Perm', 'NY'),
    v('VISITNUM', 'Visit Number', 'Num', 'Timing', 'Exp'), v('VISIT', 'Visit Name', 'Char', 'Timing', 'Perm'), v('EPOCH', 'Epoch', 'Char', 'Timing', 'Perm', 'EPOCH'),
    v('RSDTC', 'Date/Time of Assessment', 'Char', 'Timing', 'Exp'), v('RSDY', 'Study Day of Assessment', 'Num', 'Timing', 'Perm'),
  ],
  PR: [
    ...ids('PR'), v('PRGRPID', 'Group ID', 'Char', 'Identifier', 'Perm'), v('PRSPID', 'Sponsor-Defined Identifier', 'Char', 'Identifier', 'Perm'),
    v('PRTRT', 'Reported Name of Procedure', 'Char', 'Topic', 'Req'), v('PRDECOD', 'Standardized Procedure Name', 'Char', 'Synonym Qualifier', 'Perm'),
    v('PRCAT', 'Category', 'Char', 'Grouping Qualifier', 'Perm'), v('PRSCAT', 'Subcategory', 'Char', 'Grouping Qualifier', 'Perm'),
    v('PRPRESP', 'Pre-specified', 'Char', 'Variable Qualifier', 'Perm', 'NY'), v('PROCCUR', 'Occurrence', 'Char', 'Record Qualifier', 'Perm', 'NY'),
    v('PRINDC', 'Indication', 'Char', 'Record Qualifier', 'Perm'), v('PRLOC', 'Location of Procedure', 'Char', 'Record Qualifier', 'Perm', 'LOC'), v('PRLAT', 'Laterality', 'Char', 'Variable Qualifier', 'Perm', 'LAT'),
    v('PRDOSE', 'Dose', 'Num', 'Record Qualifier', 'Perm'), v('PRDOSU', 'Dose Units', 'Char', 'Variable Qualifier', 'Perm', 'UNIT'),
    v('VISITNUM', 'Visit Number', 'Num', 'Timing', 'Perm'), v('VISIT', 'Visit Name', 'Char', 'Timing', 'Perm'), v('EPOCH', 'Epoch', 'Char', 'Timing', 'Perm', 'EPOCH'),
    v('PRSTDTC', 'Start Date/Time of Procedure', 'Char', 'Timing', 'Exp'), v('PRENDTC', 'End Date/Time of Procedure', 'Char', 'Timing', 'Perm'),
    v('PRSTDY', 'Study Day of Start of Procedure', 'Num', 'Timing', 'Perm'), v('PRENDY', 'Study Day of End of Procedure', 'Num', 'Timing', 'Perm'),
    v('PRSTRTPT', 'Start Relative to Reference Time Point', 'Char', 'Timing', 'Perm', 'STENRF'), v('PRSTTPT', 'Start Reference Time Point', 'Char', 'Timing', 'Perm'),
  ],
  DD: [
    ...ids('DD'), v('DDTESTCD', 'Death Detail Assessment Short Name', 'Char', 'Topic', 'Req', 'DTHDXCD'), v('DDTEST', 'Death Detail Assessment Name', 'Char', 'Synonym Qualifier', 'Req', 'DTHDX'),
    v('DDORRES', 'Result or Finding as Collected', 'Char', 'Result Qualifier', 'Exp'), v('DDSTRESC', 'Character Result/Finding in Std Format', 'Char', 'Result Qualifier', 'Exp'),
    v('DDEVAL', 'Evaluator', 'Char', 'Record Qualifier', 'Perm', 'EVAL'),
    v('VISITNUM', 'Visit Number', 'Num', 'Timing', 'Perm'), v('VISIT', 'Visit Name', 'Char', 'Timing', 'Perm'), v('EPOCH', 'Epoch', 'Char', 'Timing', 'Perm', 'EPOCH'),
    v('DDDTC', 'Date/Time of Collection', 'Char', 'Timing', 'Perm'), v('DDDY', 'Study Day of Collection', 'Num', 'Timing', 'Perm'),
  ],
  PC: [
    ...ids('PC'), v('PCGRPID', 'Group ID', 'Char', 'Identifier', 'Perm'), v('PCREFID', 'Reference ID', 'Char', 'Identifier', 'Perm'), v('PCSPID', 'Sponsor-Defined Identifier', 'Char', 'Identifier', 'Perm'),
    v('PCTESTCD', 'Pharmacokinetic Test Short Name', 'Char', 'Topic', 'Req'), v('PCTEST', 'Pharmacokinetic Test Name', 'Char', 'Synonym Qualifier', 'Req'),
    v('PCCAT', 'Test Category', 'Char', 'Grouping Qualifier', 'Perm'), v('PCSCAT', 'Test Subcategory', 'Char', 'Grouping Qualifier', 'Perm'),
    v('PCORRES', 'Result or Finding in Original Units', 'Char', 'Result Qualifier', 'Exp'), v('PCORRESU', 'Original Units', 'Char', 'Variable Qualifier', 'Exp', 'UNIT'),
    v('PCSTRESC', 'Character Result/Finding in Std Format', 'Char', 'Result Qualifier', 'Exp'), v('PCSTRESN', 'Numeric Result/Finding in Standard Units', 'Num', 'Result Qualifier', 'Exp'), v('PCSTRESU', 'Standard Units', 'Char', 'Variable Qualifier', 'Exp', 'UNIT'),
    v('PCSTAT', 'Completion Status', 'Char', 'Record Qualifier', 'Perm', 'ND'), v('PCREASND', 'Reason Test Not Done', 'Char', 'Record Qualifier', 'Perm'),
    v('PCNAM', 'Vendor Name', 'Char', 'Record Qualifier', 'Exp'), v('PCSPEC', 'Specimen Material Type', 'Char', 'Record Qualifier', 'Req', 'SPECTYPE'), v('PCSPCCND', 'Specimen Condition', 'Char', 'Record Qualifier', 'Perm', 'SPECCOND'),
    v('PCMETHOD', 'Method of Test or Examination', 'Char', 'Record Qualifier', 'Perm'), v('PCFAST', 'Fasting Status', 'Char', 'Record Qualifier', 'Perm', 'NY'), v('PCDRVFL', 'Derived Flag', 'Char', 'Record Qualifier', 'Perm', 'NY'),
    v('PCLLOQ', 'Lower Limit of Quantitation', 'Num', 'Variable Qualifier', 'Exp'), v('PCULOQ', 'Upper Limit of Quantitation', 'Num', 'Variable Qualifier', 'Perm'),
    v('VISITNUM', 'Visit Number', 'Num', 'Timing', 'Exp'), v('VISIT', 'Visit Name', 'Char', 'Timing', 'Perm'), v('VISITDY', 'Planned Study Day of Visit', 'Num', 'Timing', 'Perm'),
    v('EPOCH', 'Epoch', 'Char', 'Timing', 'Perm', 'EPOCH'), v('PCDTC', 'Date/Time of Specimen Collection', 'Char', 'Timing', 'Exp'), v('PCENDTC', 'End Date/Time of Specimen Collection', 'Char', 'Timing', 'Perm'),
    v('PCDY', 'Study Day of Specimen Collection', 'Num', 'Timing', 'Perm'), v('PCENDY', 'Study Day of End of Observation', 'Num', 'Timing', 'Perm'),
    v('PCTPT', 'Planned Time Point Name', 'Char', 'Timing', 'Perm'), v('PCTPTNUM', 'Planned Time Point Number', 'Num', 'Timing', 'Perm'), v('PCELTM', 'Planned Elapsed Time from Time Point Ref', 'Char', 'Timing', 'Perm'),
    v('PCTPTREF', 'Time Point Reference', 'Char', 'Timing', 'Perm'), v('PCRFTDTC', 'Date/Time of Reference Time Point', 'Char', 'Timing', 'Perm'), v('PCEVLINT', 'Evaluation Interval', 'Char', 'Timing', 'Perm'),
  ],
  PP: [
    ...ids('PP'), v('PPGRPID', 'Group ID', 'Char', 'Identifier', 'Perm'),
    v('PPTESTCD', 'Parameter Short Name', 'Char', 'Topic', 'Req', 'PKPARMCD'), v('PPTEST', 'Parameter Name', 'Char', 'Synonym Qualifier', 'Req', 'PKPARM'),
    v('PPCAT', 'Parameter Category', 'Char', 'Grouping Qualifier', 'Exp'), v('PPSCAT', 'Parameter Subcategory', 'Char', 'Grouping Qualifier', 'Perm'),
    v('PPORRES', 'Result or Finding in Original Units', 'Char', 'Result Qualifier', 'Exp'), v('PPORRESU', 'Original Units', 'Char', 'Variable Qualifier', 'Exp', 'PKUNIT'),
    v('PPSTRESC', 'Character Result/Finding in Std Format', 'Char', 'Result Qualifier', 'Exp'), v('PPSTRESN', 'Numeric Result/Finding in Standard Units', 'Num', 'Result Qualifier', 'Exp'), v('PPSTRESU', 'Standard Units', 'Char', 'Variable Qualifier', 'Exp', 'PKUNIT'),
    v('PPSTAT', 'Completion Status', 'Char', 'Record Qualifier', 'Perm', 'ND'), v('PPREASND', 'Reason Parameter Not Calculated', 'Char', 'Record Qualifier', 'Perm'),
    v('PPSPEC', 'Specimen Material Type', 'Char', 'Record Qualifier', 'Exp', 'SPECTYPE'),
    v('VISITNUM', 'Visit Number', 'Num', 'Timing', 'Perm'), v('VISIT', 'Visit Name', 'Char', 'Timing', 'Perm'), v('EPOCH', 'Epoch', 'Char', 'Timing', 'Perm', 'EPOCH'),
    v('PPDTC', 'Date/Time of Parameter Calculations', 'Char', 'Timing', 'Perm'), v('PPDY', 'Study Day of Parameter Calculations', 'Num', 'Timing', 'Perm'),
    v('PPTPTREF', 'Time Point Reference', 'Char', 'Timing', 'Perm'), v('PPRFTDTC', 'Date/Time of Reference Point', 'Char', 'Timing', 'Exp'),
  ],
  DM: [
    v('STUDYID', 'Study Identifier', 'Char', 'Identifier', 'Req'), v('DOMAIN', 'Domain Abbreviation', 'Char', 'Identifier', 'Req', 'DOMAIN'), v('USUBJID', 'Unique Subject Identifier', 'Char', 'Identifier', 'Req'),
    v('SUBJID', 'Subject Identifier for the Study', 'Char', 'Topic', 'Req'),
    v('RFSTDTC', 'Subject Reference Start Date/Time', 'Char', 'Record Qualifier', 'Exp'), v('RFENDTC', 'Subject Reference End Date/Time', 'Char', 'Record Qualifier', 'Exp'),
    v('RFXSTDTC', 'Date/Time of First Study Treatment', 'Char', 'Record Qualifier', 'Exp'), v('RFXENDTC', 'Date/Time of Last Study Treatment', 'Char', 'Record Qualifier', 'Exp'),
    v('RFICDTC', 'Date/Time of Informed Consent', 'Char', 'Record Qualifier', 'Exp'), v('RFPENDTC', 'Date/Time of End of Participation', 'Char', 'Record Qualifier', 'Exp'),
    v('DTHDTC', 'Date/Time of Death', 'Char', 'Record Qualifier', 'Exp'), v('DTHFL', 'Subject Death Flag', 'Char', 'Record Qualifier', 'Exp', 'NY'),
    v('SITEID', 'Study Site Identifier', 'Char', 'Record Qualifier', 'Req'), v('INVID', 'Investigator Identifier', 'Char', 'Record Qualifier', 'Perm'), v('INVNAM', 'Investigator Name', 'Char', 'Synonym Qualifier', 'Perm'),
    v('BRTHDTC', 'Date/Time of Birth', 'Char', 'Record Qualifier', 'Perm'), v('AGE', 'Age', 'Num', 'Record Qualifier', 'Exp'), v('AGEU', 'Age Units', 'Char', 'Variable Qualifier', 'Exp', 'AGEU'),
    v('SEX', 'Sex', 'Char', 'Record Qualifier', 'Req', 'SEX'), v('RACE', 'Race', 'Char', 'Record Qualifier', 'Exp', 'RACE'), v('ETHNIC', 'Ethnicity', 'Char', 'Record Qualifier', 'Perm', 'ETHNIC'),
    v('ARMCD', 'Planned Arm Code', 'Char', 'Record Qualifier', 'Exp'), v('ARM', 'Description of Planned Arm', 'Char', 'Synonym Qualifier', 'Exp'),
    v('ACTARMCD', 'Actual Arm Code', 'Char', 'Record Qualifier', 'Exp'), v('ACTARM', 'Description of Actual Arm', 'Char', 'Synonym Qualifier', 'Exp'),
    v('ARMNRS', 'Reason Arm and/or Actual Arm is Null', 'Char', 'Record Qualifier', 'Exp', 'ARMNULRS'), v('ACTARMUD', 'Description of Unplanned Actual Arm', 'Char', 'Synonym Qualifier', 'Exp'),
    v('COUNTRY', 'Country', 'Char', 'Record Qualifier', 'Req', 'COUNTRY'), v('DMDTC', 'Date/Time of Collection', 'Char', 'Timing', 'Perm'), v('DMDY', 'Study Day of Collection', 'Num', 'Timing', 'Perm'),
  ],
  SV: [
    v('STUDYID', 'Study Identifier', 'Char', 'Identifier', 'Req'), v('DOMAIN', 'Domain Abbreviation', 'Char', 'Identifier', 'Req', 'DOMAIN'), v('USUBJID', 'Unique Subject Identifier', 'Char', 'Identifier', 'Req'),
    v('VISITNUM', 'Visit Number', 'Num', 'Topic', 'Req'), v('VISIT', 'Visit Name', 'Char', 'Synonym Qualifier', 'Perm'), v('VISITDY', 'Planned Study Day of Visit', 'Num', 'Timing', 'Perm'),
    v('TAETORD', 'Planned Order of Element within Arm', 'Num', 'Timing', 'Perm'), v('EPOCH', 'Epoch', 'Char', 'Timing', 'Perm', 'EPOCH'),
    v('SVSTDTC', 'Start Date/Time of Visit', 'Char', 'Timing', 'Exp'), v('SVENDTC', 'End Date/Time of Visit', 'Char', 'Timing', 'Exp'),
    v('SVSTDY', 'Study Day of Start of Visit', 'Num', 'Timing', 'Perm'), v('SVENDY', 'Study Day of End of Visit', 'Num', 'Timing', 'Perm'), v('SVUPDES', 'Description of Unplanned Visit', 'Char', 'Record Qualifier', 'Perm'),
  ],
  VS: [
    ...ids('VS'), v('VSGRPID', 'Group ID', 'Char', 'Identifier', 'Perm'), v('VSSPID', 'Sponsor-Defined Identifier', 'Char', 'Identifier', 'Perm'),
    v('VSTESTCD', 'Vital Signs Test Short Name', 'Char', 'Topic', 'Req', 'VSTESTCD'), v('VSTEST', 'Vital Signs Test Name', 'Char', 'Synonym Qualifier', 'Req', 'VSTEST'),
    v('VSCAT', 'Category for Vital Signs', 'Char', 'Grouping Qualifier', 'Perm'), v('VSSCAT', 'Subcategory for Vital Signs', 'Char', 'Grouping Qualifier', 'Perm'),
    v('VSPOS', 'Vital Signs Position of Subject', 'Char', 'Record Qualifier', 'Perm', 'POSITION'),
    v('VSORRES', 'Result or Finding in Original Units', 'Char', 'Result Qualifier', 'Exp'), v('VSORRESU', 'Original Units', 'Char', 'Variable Qualifier', 'Exp', 'VSRESU'),
    v('VSSTRESC', 'Character Result/Finding in Std Format', 'Char', 'Result Qualifier', 'Exp'), v('VSSTRESN', 'Numeric Result/Finding in Standard Units', 'Num', 'Result Qualifier', 'Exp'), v('VSSTRESU', 'Standard Units', 'Char', 'Variable Qualifier', 'Exp', 'VSRESU'),
    v('VSSTAT', 'Completion Status', 'Char', 'Record Qualifier', 'Perm', 'ND'), v('VSREASND', 'Reason Not Performed', 'Char', 'Record Qualifier', 'Perm'),
    v('VSLOC', 'Location of Vital Signs Measurement', 'Char', 'Record Qualifier', 'Perm', 'LOC'), v('VSLAT', 'Laterality', 'Char', 'Variable Qualifier', 'Perm', 'LAT'),
    v('VSLOBXFL', 'Last Observation Before Exposure Flag', 'Char', 'Record Qualifier', 'Exp', 'NY'), v('VSBLFL', 'Baseline Flag', 'Char', 'Record Qualifier', 'Perm', 'NY'), v('VSDRVFL', 'Derived Flag', 'Char', 'Record Qualifier', 'Perm', 'NY'),
    v('VISITNUM', 'Visit Number', 'Num', 'Timing', 'Exp'), v('VISIT', 'Visit Name', 'Char', 'Timing', 'Perm'), v('VISITDY', 'Planned Study Day of Visit', 'Num', 'Timing', 'Perm'),
    v('TAETORD', 'Planned Order of Element within Arm', 'Num', 'Timing', 'Perm'), v('EPOCH', 'Epoch', 'Char', 'Timing', 'Perm', 'EPOCH'),
    v('VSDTC', 'Date/Time of Measurements', 'Char', 'Timing', 'Exp'), v('VSDY', 'Study Day of Vital Signs', 'Num', 'Timing', 'Perm'),
    v('VSTPT', 'Planned Time Point Name', 'Char', 'Timing', 'Perm'), v('VSTPTNUM', 'Planned Time Point Number', 'Num', 'Timing', 'Perm'), v('VSTPTREF', 'Time Point Reference', 'Char', 'Timing', 'Perm'), v('VSRFTDTC', 'Date/Time of Reference Time Point', 'Char', 'Timing', 'Perm'),
  ],
  EX: [
    ...ids('EX'), v('EXGRPID', 'Group ID', 'Char', 'Identifier', 'Perm'), v('EXSPID', 'Sponsor-Defined Identifier', 'Char', 'Identifier', 'Perm'),
    v('EXTRT', 'Name of Treatment', 'Char', 'Topic', 'Req'), v('EXCAT', 'Category of Treatment', 'Char', 'Grouping Qualifier', 'Perm'),
    v('EXDOSE', 'Dose', 'Num', 'Record Qualifier', 'Exp'), v('EXDOSTXT', 'Dose Description', 'Char', 'Record Qualifier', 'Perm'), v('EXDOSU', 'Dose Units', 'Char', 'Variable Qualifier', 'Exp', 'UNIT'),
    v('EXDOSFRM', 'Dose Form', 'Char', 'Variable Qualifier', 'Exp', 'FRM'), v('EXDOSFRQ', 'Dosing Frequency per Interval', 'Char', 'Variable Qualifier', 'Perm', 'FREQ'),
    v('EXROUTE', 'Route of Administration', 'Char', 'Variable Qualifier', 'Perm', 'ROUTE'), v('EXLOT', 'Lot Number', 'Char', 'Record Qualifier', 'Perm'), v('EXLOC', 'Location of Dose Administration', 'Char', 'Record Qualifier', 'Perm', 'LOC'), v('EXLAT', 'Laterality', 'Char', 'Variable Qualifier', 'Perm', 'LAT'), v('EXADJ', 'Reason for Dose Adjustment', 'Char', 'Record Qualifier', 'Perm'),
    v('VISITNUM', 'Visit Number', 'Num', 'Timing', 'Perm'), v('VISIT', 'Visit Name', 'Char', 'Timing', 'Perm'), v('EPOCH', 'Epoch', 'Char', 'Timing', 'Perm', 'EPOCH'), v('EXSTDTC', 'Start Date/Time of Treatment', 'Char', 'Timing', 'Exp'), v('EXENDTC', 'End Date/Time of Treatment', 'Char', 'Timing', 'Exp'),
    v('EXSTDY', 'Study Day of Start of Treatment', 'Num', 'Timing', 'Perm'), v('EXENDY', 'Study Day of End of Treatment', 'Num', 'Timing', 'Perm'),
  ],
  AE: [
    ...ids('AE'), v('AESPID', 'Sponsor-Defined Identifier', 'Char', 'Identifier', 'Perm'),
    v('AETERM', 'Reported Term for the Adverse Event', 'Char', 'Topic', 'Req'), v('AEMODIFY', 'Modified Reported Term', 'Char', 'Synonym Qualifier', 'Perm'),
    v('AELLT', 'Lowest Level Term', 'Char', 'Variable Qualifier', 'Exp'), v('AELLTCD', 'Lowest Level Term Code', 'Num', 'Variable Qualifier', 'Exp'),
    v('AEDECOD', 'Dictionary-Derived Term', 'Char', 'Synonym Qualifier', 'Req'), v('AEPTCD', 'Preferred Term Code', 'Num', 'Variable Qualifier', 'Exp'),
    v('AEHLT', 'High Level Term', 'Char', 'Variable Qualifier', 'Exp'), v('AEHLTCD', 'High Level Term Code', 'Num', 'Variable Qualifier', 'Exp'),
    v('AEHLGT', 'High Level Group Term', 'Char', 'Variable Qualifier', 'Exp'), v('AEHLGTCD', 'High Level Group Term Code', 'Num', 'Variable Qualifier', 'Exp'),
    v('AEBODSYS', 'Body System or Organ Class', 'Char', 'Record Qualifier', 'Exp'), v('AEBDSYCD', 'Body System or Organ Class Code', 'Num', 'Variable Qualifier', 'Exp'),
    v('AESOC', 'Primary System Organ Class', 'Char', 'Variable Qualifier', 'Exp'), v('AESOCCD', 'Primary System Organ Class Code', 'Num', 'Variable Qualifier', 'Exp'),
    v('AESEV', 'Severity/Intensity', 'Char', 'Record Qualifier', 'Perm', 'AESEV'), v('AESER', 'Serious Event', 'Char', 'Record Qualifier', 'Exp', 'NY'),
    v('AEACN', 'Action Taken with Study Treatment', 'Char', 'Record Qualifier', 'Exp', 'ACN'), v('AEREL', 'Causality', 'Char', 'Record Qualifier', 'Exp'),
    v('AEOUT', 'Outcome of Adverse Event', 'Char', 'Record Qualifier', 'Perm', 'OUT'),
    v('AESDTH', 'Results in Death', 'Char', 'Record Qualifier', 'Perm', 'NY'), v('AESHOSP', 'Requires or Prolongs Hospitalization', 'Char', 'Record Qualifier', 'Perm', 'NY'),
    v('EPOCH', 'Epoch', 'Char', 'Timing', 'Perm', 'EPOCH'), v('AESTDTC', 'Start Date/Time of Adverse Event', 'Char', 'Timing', 'Exp'), v('AEENDTC', 'End Date/Time of Adverse Event', 'Char', 'Timing', 'Exp'),
    v('AESTDY', 'Study Day of Start of Adverse Event', 'Num', 'Timing', 'Perm'), v('AEENDY', 'Study Day of End of Adverse Event', 'Num', 'Timing', 'Perm'),
  ],
  CM: [
    ...ids('CM'), v('CMSPID', 'Sponsor-Defined Identifier', 'Char', 'Identifier', 'Perm'),
    v('CMTRT', 'Reported Name of Drug, Med, or Therapy', 'Char', 'Topic', 'Req'), v('CMDECOD', 'Standardized Medication Name', 'Char', 'Synonym Qualifier', 'Perm'),
    v('CMCAT', 'Category for Medication', 'Char', 'Grouping Qualifier', 'Perm'), v('CMINDC', 'Indication', 'Char', 'Record Qualifier', 'Perm'),
    v('CMCLAS', 'Medication Class', 'Char', 'Variable Qualifier', 'Perm'), v('CMDOSE', 'Dose per Administration', 'Num', 'Record Qualifier', 'Perm'),
    v('CMDOSU', 'Dose Units', 'Char', 'Variable Qualifier', 'Perm', 'UNIT'), v('CMDOSTOT', 'Total Daily Dose', 'Num', 'Record Qualifier', 'Perm'), v('CMDOSFRQ', 'Dosing Frequency per Interval', 'Char', 'Variable Qualifier', 'Perm', 'FREQ'),
    v('CMROUTE', 'Route of Administration', 'Char', 'Variable Qualifier', 'Perm', 'ROUTE'),
    v('EPOCH', 'Epoch', 'Char', 'Timing', 'Perm', 'EPOCH'), v('CMSTDTC', 'Start Date/Time of Medication', 'Char', 'Timing', 'Perm'), v('CMENDTC', 'End Date/Time of Medication', 'Char', 'Timing', 'Perm'),
    v('CMSTDY', 'Study Day of Start of Medication', 'Num', 'Timing', 'Perm'), v('CMENDY', 'Study Day of End of Medication', 'Num', 'Timing', 'Perm'),
    v('CMENRTPT', 'End Relative to Reference Time Point', 'Char', 'Timing', 'Perm', 'STENRF'), v('CMENTPT', 'End Reference Time Point', 'Char', 'Timing', 'Perm'),
  ],
  DS: [
    ...ids('DS'), v('DSSPID', 'Sponsor-Defined Identifier', 'Char', 'Identifier', 'Perm'),
    v('DSTERM', 'Reported Term for the Disposition Event', 'Char', 'Topic', 'Req'), v('DSDECOD', 'Standardized Disposition Term', 'Char', 'Synonym Qualifier', 'Req', 'NCOMPLT'),
    v('DSCAT', 'Category for Disposition Event', 'Char', 'Grouping Qualifier', 'Exp', 'DSCAT'), v('DSSCAT', 'Subcategory for Disposition Event', 'Char', 'Grouping Qualifier', 'Perm'),
    v('EPOCH', 'Epoch', 'Char', 'Timing', 'Perm', 'EPOCH'), v('DSDTC', 'Date/Time of Collection', 'Char', 'Timing', 'Perm'),
    v('DSSTDTC', 'Start Date/Time of Disposition Event', 'Char', 'Timing', 'Exp'), v('DSSTDY', 'Study Day of Start of Disposition Event', 'Num', 'Timing', 'Perm'),
  ],
  LB: [
    ...ids('LB'), v('LBGRPID', 'Group ID', 'Char', 'Identifier', 'Perm'), v('LBREFID', 'Specimen ID', 'Char', 'Identifier', 'Perm'), v('LBSPID', 'Sponsor-Defined Identifier', 'Char', 'Identifier', 'Perm'),
    v('LBTESTCD', 'Lab Test or Examination Short Name', 'Char', 'Topic', 'Req', 'LBTESTCD'), v('LBTEST', 'Lab Test or Examination Name', 'Char', 'Synonym Qualifier', 'Req', 'LBTEST'),
    v('LBCAT', 'Category for Lab Test', 'Char', 'Grouping Qualifier', 'Exp'), v('LBSCAT', 'Subcategory for Lab Test', 'Char', 'Grouping Qualifier', 'Perm'),
    v('LBORRES', 'Result or Finding in Original Units', 'Char', 'Result Qualifier', 'Exp'), v('LBORRESU', 'Original Units', 'Char', 'Variable Qualifier', 'Exp', 'UNIT'),
    v('LBORNRLO', 'Reference Range Lower Limit in Orig Unit', 'Char', 'Variable Qualifier', 'Exp'), v('LBORNRHI', 'Reference Range Upper Limit in Orig Unit', 'Char', 'Variable Qualifier', 'Exp'),
    v('LBSTRESC', 'Character Result/Finding in Std Format', 'Char', 'Result Qualifier', 'Exp'), v('LBSTRESN', 'Numeric Result/Finding in Standard Units', 'Num', 'Result Qualifier', 'Exp'), v('LBSTRESU', 'Standard Units', 'Char', 'Variable Qualifier', 'Exp', 'UNIT'),
    v('LBSTNRLO', 'Reference Range Lower Limit-Std Units', 'Num', 'Variable Qualifier', 'Exp'), v('LBSTNRHI', 'Reference Range Upper Limit-Std Units', 'Num', 'Variable Qualifier', 'Exp'),
    v('LBNRIND', 'Reference Range Indicator', 'Char', 'Variable Qualifier', 'Exp', 'NRIND'),
    v('LBSTAT', 'Completion Status', 'Char', 'Record Qualifier', 'Perm', 'ND'), v('LBREASND', 'Reason Test Not Done', 'Char', 'Record Qualifier', 'Perm'),
    v('LBNAM', 'Vendor Name', 'Char', 'Record Qualifier', 'Perm'), v('LBSPEC', 'Specimen Type', 'Char', 'Record Qualifier', 'Perm', 'SPECTYPE'), v('LBMETHOD', 'Method of Test or Examination', 'Char', 'Record Qualifier', 'Perm'),
    v('LBLOBXFL', 'Last Observation Before Exposure Flag', 'Char', 'Record Qualifier', 'Exp', 'NY'), v('LBBLFL', 'Baseline Flag', 'Char', 'Record Qualifier', 'Perm', 'NY'),
    v('LBFAST', 'Fasting Status', 'Char', 'Record Qualifier', 'Perm', 'NY'), v('LBDRVFL', 'Derived Flag', 'Char', 'Record Qualifier', 'Perm', 'NY'),
    v('VISITNUM', 'Visit Number', 'Num', 'Timing', 'Exp'), v('VISIT', 'Visit Name', 'Char', 'Timing', 'Perm'), v('VISITDY', 'Planned Study Day of Visit', 'Num', 'Timing', 'Perm'),
    v('EPOCH', 'Epoch', 'Char', 'Timing', 'Perm', 'EPOCH'), v('LBDTC', 'Date/Time of Specimen Collection', 'Char', 'Timing', 'Exp'), v('LBDY', 'Study Day of Specimen Collection', 'Num', 'Timing', 'Perm'),
    v('LBTPT', 'Planned Time Point Name', 'Char', 'Timing', 'Perm'), v('LBTPTNUM', 'Planned Time Point Number', 'Num', 'Timing', 'Perm'), v('LBELTM', 'Planned Elapsed Time from Time Point Ref', 'Char', 'Timing', 'Perm'), v('LBTPTREF', 'Time Point Reference', 'Char', 'Timing', 'Perm'),
  ],
  SE: [
    v('STUDYID', 'Study Identifier', 'Char', 'Identifier', 'Req'), v('DOMAIN', 'Domain Abbreviation', 'Char', 'Identifier', 'Req', 'DOMAIN'), v('USUBJID', 'Unique Subject Identifier', 'Char', 'Identifier', 'Req'),
    v('SESEQ', 'Sequence Number', 'Num', 'Identifier', 'Req'), v('ETCD', 'Element Code', 'Char', 'Topic', 'Req'), v('ELEMENT', 'Description of Element', 'Char', 'Synonym Qualifier', 'Perm'),
    v('TAETORD', 'Planned Order of Element within Arm', 'Num', 'Timing', 'Perm'), v('EPOCH', 'Epoch', 'Char', 'Timing', 'Perm', 'EPOCH'),
    v('SESTDTC', 'Start Date/Time of Element', 'Char', 'Timing', 'Req'), v('SEENDTC', 'End Date/Time of Element', 'Char', 'Timing', 'Exp'),
    v('SESTDY', 'Study Day of Start of Element', 'Num', 'Timing', 'Perm'), v('SEENDY', 'Study Day of End of Element', 'Num', 'Timing', 'Perm'), v('SEUPDES', 'Description of Unplanned Element', 'Char', 'Synonym Qualifier', 'Perm'),
  ],
  TA: [
    v('STUDYID', 'Study Identifier', 'Char', 'Identifier', 'Req'), v('DOMAIN', 'Domain Abbreviation', 'Char', 'Identifier', 'Req', 'DOMAIN'),
    v('ARMCD', 'Planned Arm Code', 'Char', 'Topic', 'Req'), v('ARM', 'Description of Planned Arm', 'Char', 'Synonym Qualifier', 'Req'),
    v('TAETORD', 'Planned Order of Element within Arm', 'Num', 'Timing', 'Req'), v('ETCD', 'Element Code', 'Char', 'Record Qualifier', 'Req'), v('ELEMENT', 'Description of Element', 'Char', 'Synonym Qualifier', 'Perm'),
    v('TABRANCH', 'Branch', 'Char', 'Rule', 'Exp'), v('TATRANS', 'Transition Rule', 'Char', 'Rule', 'Exp'), v('EPOCH', 'Epoch', 'Char', 'Timing', 'Req', 'EPOCH'),
  ],
  TE: [
    v('STUDYID', 'Study Identifier', 'Char', 'Identifier', 'Req'), v('DOMAIN', 'Domain Abbreviation', 'Char', 'Identifier', 'Req', 'DOMAIN'),
    v('ETCD', 'Element Code', 'Char', 'Topic', 'Req'), v('ELEMENT', 'Description of Element', 'Char', 'Synonym Qualifier', 'Req'),
    v('TESTRL', 'Rule for Start of Element', 'Char', 'Rule', 'Req'), v('TEENRL', 'Rule for End of Element', 'Char', 'Rule', 'Perm'), v('TEDUR', 'Planned Duration of Element', 'Char', 'Timing', 'Perm'),
  ],
  TV: [
    v('STUDYID', 'Study Identifier', 'Char', 'Identifier', 'Req'), v('DOMAIN', 'Domain Abbreviation', 'Char', 'Identifier', 'Req', 'DOMAIN'),
    v('VISITNUM', 'Visit Number', 'Num', 'Topic', 'Req'), v('VISIT', 'Visit Name', 'Char', 'Synonym Qualifier', 'Perm'), v('VISITDY', 'Planned Study Day of Visit', 'Num', 'Timing', 'Perm'),
    v('ARMCD', 'Planned Arm Code', 'Char', 'Record Qualifier', 'Exp'), v('ARM', 'Description of Planned Arm', 'Char', 'Synonym Qualifier', 'Perm'),
    v('TVSTRL', 'Visit Start Rule', 'Char', 'Rule', 'Req'), v('TVENRL', 'Visit End Rule', 'Char', 'Rule', 'Perm'),
  ],
  TI: [
    v('STUDYID', 'Study Identifier', 'Char', 'Identifier', 'Req'), v('DOMAIN', 'Domain Abbreviation', 'Char', 'Identifier', 'Req', 'DOMAIN'),
    v('IETESTCD', 'Incl/Excl Criterion Short Name', 'Char', 'Topic', 'Req'), v('IETEST', 'Inclusion/Exclusion Criterion', 'Char', 'Synonym Qualifier', 'Req'),
    v('IECAT', 'Inclusion/Exclusion Category', 'Char', 'Grouping Qualifier', 'Req', 'IECAT'), v('IESCAT', 'Inclusion/Exclusion Subcategory', 'Char', 'Grouping Qualifier', 'Perm'),
    v('TIRL', 'Inclusion/Exclusion Criterion Rule', 'Char', 'Rule', 'Perm'), v('TIVERS', 'Protocol Criteria Versions', 'Char', 'Record Qualifier', 'Perm'),
  ],
  TS: [
    v('STUDYID', 'Study Identifier', 'Char', 'Identifier', 'Req'), v('DOMAIN', 'Domain Abbreviation', 'Char', 'Identifier', 'Req', 'DOMAIN'),
    v('TSSEQ', 'Sequence Number', 'Num', 'Identifier', 'Req'), v('TSGRPID', 'Group ID', 'Char', 'Identifier', 'Perm'),
    v('TSPARMCD', 'Trial Summary Parameter Short Name', 'Char', 'Topic', 'Req', 'TSPARMCD'), v('TSPARM', 'Trial Summary Parameter', 'Char', 'Synonym Qualifier', 'Req', 'TSPARM'),
    v('TSVAL', 'Parameter Value', 'Char', 'Result Qualifier', 'Exp'), v('TSVAL1', 'Parameter Value 1', 'Char', 'Result Qualifier', 'Perm'), v('TSVALNF', 'Parameter Null Flavor', 'Char', 'Result Qualifier', 'Perm'),
    v('TSVALCD', 'Parameter Value Code', 'Char', 'Result Qualifier', 'Exp'), v('TSVCDREF', 'Name of the Reference Terminology', 'Char', 'Result Qualifier', 'Exp'), v('TSVCDVER', 'Version of the Reference Terminology', 'Char', 'Result Qualifier', 'Exp'),
  ],
  IE: [
    ...ids('IE'), v('IESPID', 'Sponsor-Defined Identifier', 'Char', 'Identifier', 'Perm'),
    v('IETESTCD', 'Inclusion/Exclusion Criterion Short Name', 'Char', 'Topic', 'Req'), v('IETEST', 'Inclusion/Exclusion Criterion', 'Char', 'Synonym Qualifier', 'Req'),
    v('IECAT', 'Inclusion/Exclusion Category', 'Char', 'Grouping Qualifier', 'Req', 'IECAT'), v('IESCAT', 'Inclusion/Exclusion Subcategory', 'Char', 'Grouping Qualifier', 'Perm'),
    v('IEORRES', 'I/E Criterion Original Result', 'Char', 'Result Qualifier', 'Req', 'NY'), v('IESTRESC', 'I/E Criterion Result in Std Format', 'Char', 'Result Qualifier', 'Req', 'NY'),
    v('VISITNUM', 'Visit Number', 'Num', 'Timing', 'Perm'), v('VISIT', 'Visit Name', 'Char', 'Timing', 'Perm'), v('VISITDY', 'Planned Study Day of Visit', 'Num', 'Timing', 'Perm'),
    v('EPOCH', 'Epoch', 'Char', 'Timing', 'Perm', 'EPOCH'), v('IEDTC', 'Date/Time of Collection', 'Char', 'Timing', 'Perm'), v('IEDY', 'Study Day of Collection', 'Num', 'Timing', 'Perm'),
  ],
  MH: [
    ...ids('MH'), v('MHSPID', 'Sponsor-Defined Identifier', 'Char', 'Identifier', 'Perm'),
    v('MHTERM', 'Reported Term for the Medical History', 'Char', 'Topic', 'Req'), v('MHMODIFY', 'Modified Reported Term', 'Char', 'Synonym Qualifier', 'Perm'),
    v('MHDECOD', 'Dictionary-Derived Term', 'Char', 'Synonym Qualifier', 'Perm'), v('MHCAT', 'Category for Medical History', 'Char', 'Grouping Qualifier', 'Perm'),
    v('MHSCAT', 'Subcategory for Medical History', 'Char', 'Grouping Qualifier', 'Perm'), v('MHPRESP', 'Medical History Event Pre-Specified', 'Char', 'Variable Qualifier', 'Perm', 'NY'),
    v('MHOCCUR', 'Medical History Occurrence', 'Char', 'Record Qualifier', 'Perm', 'NY'), v('MHBODSYS', 'Body System or Organ Class', 'Char', 'Record Qualifier', 'Perm'),
    v('MHDTC', 'Date/Time of History Collection', 'Char', 'Timing', 'Perm'), v('MHSTDTC', 'Start Date/Time of Medical History Event', 'Char', 'Timing', 'Perm'),
    v('MHENDTC', 'End Date/Time of Medical History Event', 'Char', 'Timing', 'Perm'), v('MHDY', 'Study Day of History Collection', 'Num', 'Timing', 'Perm'),
    v('MHENRTPT', 'End Relative to Reference Time Point', 'Char', 'Timing', 'Perm', 'STENRF'), v('MHENTPT', 'End Reference Time Point', 'Char', 'Timing', 'Perm'),
  ],
  EC: [
    ...ids('EC'), v('ECSPID', 'Sponsor-Defined Identifier', 'Char', 'Identifier', 'Perm'), v('ECLNKID', 'Link ID', 'Char', 'Identifier', 'Perm'),
    v('ECTRT', 'Name of Treatment', 'Char', 'Topic', 'Req'), v('ECCAT', 'Category of Treatment', 'Char', 'Grouping Qualifier', 'Perm'),
    v('ECMOOD', 'Mood', 'Char', 'Record Qualifier', 'Perm'), v('ECPRESP', 'Pre-Specified', 'Char', 'Variable Qualifier', 'Perm', 'NY'), v('ECOCCUR', 'Occurrence', 'Char', 'Record Qualifier', 'Perm', 'NY'),
    v('ECDOSE', 'Dose', 'Num', 'Record Qualifier', 'Exp'), v('ECDOSU', 'Dose Units', 'Char', 'Variable Qualifier', 'Exp', 'UNIT'), v('ECDOSFRM', 'Dose Form', 'Char', 'Variable Qualifier', 'Exp', 'FRM'),
    v('ECDOSFRQ', 'Dosing Frequency per Interval', 'Char', 'Variable Qualifier', 'Perm', 'FREQ'), v('ECROUTE', 'Route of Administration', 'Char', 'Variable Qualifier', 'Perm', 'ROUTE'),
    v('ECLOT', 'Lot Number', 'Char', 'Record Qualifier', 'Perm'), v('ECREFID', 'Reference ID', 'Char', 'Identifier', 'Perm'),
    v('EPOCH', 'Epoch', 'Char', 'Timing', 'Perm', 'EPOCH'), v('ECSTDTC', 'Start Date/Time of Treatment', 'Char', 'Timing', 'Exp'), v('ECENDTC', 'End Date/Time of Treatment', 'Char', 'Timing', 'Exp'),
    v('ECSTDY', 'Study Day of Start of Treatment', 'Num', 'Timing', 'Perm'), v('ECENDY', 'Study Day of End of Treatment', 'Num', 'Timing', 'Perm'),
  ],
  DV: [
    ...ids('DV'), v('DVREFID', 'Reference ID', 'Char', 'Identifier', 'Perm'), v('DVSPID', 'Sponsor-Defined Identifier', 'Char', 'Identifier', 'Perm'),
    v('DVTERM', 'Protocol Deviation Term', 'Char', 'Topic', 'Req'), v('DVDECOD', 'Protocol Deviation Coded Term', 'Char', 'Synonym Qualifier', 'Perm'),
    v('DVCAT', 'Category for Protocol Deviation', 'Char', 'Grouping Qualifier', 'Perm'), v('DVSCAT', 'Subcategory for Protocol Deviation', 'Char', 'Grouping Qualifier', 'Perm'),
    v('EPOCH', 'Epoch', 'Char', 'Timing', 'Perm', 'EPOCH'), v('DVSTDTC', 'Start Date/Time of Deviation', 'Char', 'Timing', 'Perm'), v('DVENDTC', 'End Date/Time of Deviation', 'Char', 'Timing', 'Perm'),
    v('DVSTDY', 'Study Day of Start of Deviation', 'Num', 'Timing', 'Perm'),
  ],
  CO: [
    v('STUDYID', 'Study Identifier', 'Char', 'Identifier', 'Req'), v('DOMAIN', 'Domain Abbreviation', 'Char', 'Identifier', 'Req', 'DOMAIN'), v('RDOMAIN', 'Related Domain Abbreviation', 'Char', 'Record Qualifier', 'Perm'),
    v('USUBJID', 'Unique Subject Identifier', 'Char', 'Identifier', 'Req'), v('COSEQ', 'Sequence Number', 'Num', 'Identifier', 'Req'),
    v('IDVAR', 'Identifying Variable', 'Char', 'Record Qualifier', 'Perm'), v('IDVARVAL', 'Identifying Variable Value', 'Char', 'Record Qualifier', 'Perm'),
    v('COREF', 'Comment Reference', 'Char', 'Record Qualifier', 'Perm'), v('COVAL', 'Comment', 'Char', 'Topic', 'Req'), v('COVAL1', 'Comment 1', 'Char', 'Topic', 'Perm'),
    v('COEVAL', 'Evaluator', 'Char', 'Record Qualifier', 'Perm'), v('CODTC', 'Date/Time of Comment', 'Char', 'Timing', 'Perm'), v('CODY', 'Study Day of Comment', 'Num', 'Timing', 'Perm'),
  ],
  SUPPQUAL: [
    v('STUDYID', 'Study Identifier', 'Char', 'Identifier', 'Req'), v('RDOMAIN', 'Related Domain Abbreviation', 'Char', 'Identifier', 'Req'), v('USUBJID', 'Unique Subject Identifier', 'Char', 'Identifier', 'Exp'),
    v('IDVAR', 'Identifying Variable', 'Char', 'Identifier', 'Exp'), v('IDVARVAL', 'Identifying Variable Value', 'Char', 'Identifier', 'Exp'),
    v('QNAM', 'Qualifier Variable Name', 'Char', 'Topic', 'Req'), v('QLABEL', 'Qualifier Variable Label', 'Char', 'Synonym Qualifier', 'Req'),
    v('QVAL', 'Data Value', 'Char', 'Result Qualifier', 'Req'), v('QORIG', 'Origin', 'Char', 'Record Qualifier', 'Req'), v('QEVAL', 'Evaluator', 'Char', 'Record Qualifier', 'Exp'),
  ],
  RELREC: [
    v('STUDYID', 'Study Identifier', 'Char', 'Identifier', 'Req'), v('RDOMAIN', 'Related Domain Abbreviation', 'Char', 'Identifier', 'Req'), v('USUBJID', 'Unique Subject Identifier', 'Char', 'Identifier', 'Exp'),
    v('IDVAR', 'Identifying Variable', 'Char', 'Identifier', 'Req'), v('IDVARVAL', 'Identifying Variable Value', 'Char', 'Identifier', 'Exp'),
    v('RELTYPE', 'Relationship Type', 'Char', 'Record Qualifier', 'Exp'), v('RELID', 'Relationship Identifier', 'Char', 'Record Qualifier', 'Req'),
  ],
  // SDTMIG v4.0 draft: one horizontal NS-- record per parent record; the non-standard variables
  // themselves are columns whose metadata (label, type, origin) lives in define.xml.
  NSQUAL: [
    v('STUDYID', 'Study Identifier', 'Char', 'Identifier', 'Req'), v('RDOMAIN', 'Related Domain Abbreviation', 'Char', 'Identifier', 'Req'), v('USUBJID', 'Unique Subject Identifier', 'Char', 'Identifier', 'Req'),
    v('IDVAR', 'Identifying Variable', 'Char', 'Identifier', 'Exp'), v('IDVARVLN', 'Identifying Variable Numeric Value', 'Num', 'Identifier', 'Exp'),
  ],
}
// The dataset that carries a domain's non-standard values: SUPP-- in v3.4, NS-- in the v4.0 draft.
// Missions name it by its v3.4 name (SUPPAE); relName gives the name for the project's version.

// SENDIG v3.1.1 variables for the domains the nonclinical study maps (names, labels, types and
// core status as in the guide).
const NOM = (d: string) => [v(`${d}NOMDY`, 'Nominal Study Day for Tabulations', 'Num', 'Timing', 'Exp'), v(`${d}NOMLBL`, 'Label for Nominal Study Day', 'Char', 'Timing', 'Perm')]
const META_SEND: Record<string, VarMeta[]> = {
  DM: [
    v('STUDYID', 'Study Identifier', 'Char', 'Identifier', 'Req'), v('DOMAIN', 'Domain Abbreviation', 'Char', 'Identifier', 'Req', 'DOMAIN'), v('USUBJID', 'Unique Subject Identifier', 'Char', 'Identifier', 'Req'),
    v('SUBJID', 'Subject Identifier for the Study', 'Char', 'Topic', 'Req'), v('RFSTDTC', 'Subject Reference Start Date/Time', 'Char', 'Record Qualifier', 'Req'), v('RFENDTC', 'Subject Reference End Date/Time', 'Char', 'Record Qualifier', 'Exp'),
    v('RFXSTDTC', 'Date/Time of First Study Treatment', 'Char', 'Record Qualifier', 'Perm'), v('RFXENDTC', 'Date/Time of Last Study Treatment', 'Char', 'Record Qualifier', 'Perm'),
    v('SITEID', 'Study Site Identifier', 'Char', 'Record Qualifier', 'Perm'), v('BRTHDTC', 'Date/Time of Birth', 'Char', 'Record Qualifier', 'Perm'), v('AGE', 'Age', 'Num', 'Record Qualifier', 'Perm'),
    v('AGETXT', 'Age Range', 'Char', 'Record Qualifier', 'Perm'), v('AGEU', 'Age Unit', 'Char', 'Variable Qualifier', 'Exp', 'AGEU'), v('SEX', 'Sex', 'Char', 'Record Qualifier', 'Req', 'SEX'),
    v('SPECIES', 'Species', 'Char', 'Record Qualifier', 'Perm', 'SPECIES'), v('STRAIN', 'Strain/Substrain', 'Char', 'Record Qualifier', 'Perm', 'STRAIN'), v('SBSTRAIN', 'Strain/Substrain Details', 'Char', 'Record Qualifier', 'Perm'),
    v('ARMCD', 'Planned Arm Code', 'Char', 'Record Qualifier', 'Exp'), v('ARM', 'Description of Planned Arm', 'Char', 'Synonym Qualifier', 'Perm'), v('SETCD', 'Set Code', 'Char', 'Record Qualifier', 'Req'),
  ],
  EX: [
    v('STUDYID', 'Study Identifier', 'Char', 'Identifier', 'Req'), v('DOMAIN', 'Domain Abbreviation', 'Char', 'Identifier', 'Req', 'DOMAIN'), v('USUBJID', 'Unique Subject Identifier', 'Char', 'Identifier', 'Exp'),
    v('POOLID', 'Pool Identifier', 'Char', 'Identifier', 'Perm'), v('EXSEQ', 'Sequence Number', 'Num', 'Identifier', 'Req'), v('EXTRT', 'Name of Actual Treatment', 'Char', 'Topic', 'Req'),
    v('EXDOSE', 'Dose per Administration', 'Num', 'Record Qualifier', 'Exp'), v('EXDOSTXT', 'Dose Description', 'Char', 'Record Qualifier', 'Perm'), v('EXDOSU', 'Dose Units', 'Char', 'Variable Qualifier', 'Exp', 'UNIT'),
    v('EXDOSFRM', 'Dose Form', 'Char', 'Variable Qualifier', 'Exp', 'FRM'), v('EXDOSFRQ', 'Dosing Frequency per Interval', 'Char', 'Variable Qualifier', 'Req', 'FREQ'), v('EXROUTE', 'Route of Administration', 'Char', 'Variable Qualifier', 'Req', 'ROUTE'),
    v('EXLOT', 'Lot Number', 'Char', 'Record Qualifier', 'Exp'), v('EXLOC', 'Location of Dose Administration', 'Char', 'Record Qualifier', 'Perm'), v('EXMETHOD', 'Method of Administration', 'Char', 'Record Qualifier', 'Perm'),
    v('EXTRTV', 'Treatment Vehicle', 'Char', 'Record Qualifier', 'Exp'), v('EXVAMT', 'Amount Administered', 'Num', 'Record Qualifier', 'Perm'), v('EXVAMTU', 'Amount Administered Units', 'Char', 'Variable Qualifier', 'Perm', 'UNIT'),
    v('EXSTDTC', 'Start Date/Time of Treatment', 'Char', 'Timing', 'Exp'), v('EXENDTC', 'End Date/Time of Treatment', 'Char', 'Timing', 'Perm'), v('EXSTDY', 'Study Day of Start of Treatment', 'Num', 'Timing', 'Perm'), v('EXENDY', 'Study Day of End of Treatment', 'Num', 'Timing', 'Perm'),
  ],
  BW: [
    ...ids('BW'), v('BWTESTCD', 'Test Short Name', 'Char', 'Topic', 'Req', 'BWTESTCD'), v('BWTEST', 'Test Name', 'Char', 'Synonym Qualifier', 'Req', 'BWTEST'),
    v('BWORRES', 'Result or Findings as Collected', 'Char', 'Result Qualifier', 'Exp'), v('BWORRESU', 'Unit of the Original Result', 'Char', 'Variable Qualifier', 'Exp', 'UNIT'),
    v('BWSTRESC', 'Standardized Result in Character Format', 'Char', 'Result Qualifier', 'Exp'), v('BWSTRESN', 'Standardized Result in Numeric Format', 'Num', 'Result Qualifier', 'Exp'), v('BWSTRESU', 'Unit of the Standardized Result', 'Char', 'Variable Qualifier', 'Exp', 'UNIT'),
    v('BWSTAT', 'Completion Status', 'Char', 'Record Qualifier', 'Perm', 'ND'), v('BWREASND', 'Reason Not Done', 'Char', 'Record Qualifier', 'Perm'), v('BWBLFL', 'Baseline Flag', 'Char', 'Record Qualifier', 'Exp', 'NY'),
    v('BWFAST', 'Fasting Status', 'Char', 'Record Qualifier', 'Perm', 'NY'), v('BWEXCLFL', 'Exclusion Flag', 'Char', 'Record Qualifier', 'Perm', 'NY'), v('BWREASEX', 'Reason for Exclusion', 'Char', 'Record Qualifier', 'Perm'),
    v('BWUSCHFL', 'Unscheduled Flag', 'Char', 'Record Qualifier', 'Perm', 'NY'), v('VISITDY', 'Planned Study Day of Collection', 'Num', 'Timing', 'Perm'),
    v('BWDTC', 'Date/Time Animal Weighed', 'Char', 'Timing', 'Exp'), v('BWDY', 'Study Day Animal Weighed', 'Num', 'Timing', 'Perm'), ...NOM('BW'),
  ],
  CL: [
    v('STUDYID', 'Study Identifier', 'Char', 'Identifier', 'Req'), v('DOMAIN', 'Domain Abbreviation', 'Char', 'Identifier', 'Req', 'DOMAIN'), v('USUBJID', 'Unique Subject Identifier', 'Char', 'Identifier', 'Exp'),
    v('CLSEQ', 'Sequence Number', 'Num', 'Identifier', 'Req'), v('CLTESTCD', 'Test Short Name', 'Char', 'Topic', 'Req'), v('CLTEST', 'Test Name', 'Char', 'Synonym Qualifier', 'Req'),
    v('CLCAT', 'Category for Clinical Observations', 'Char', 'Grouping Qualifier', 'Req', 'CLCAT'), v('CLSCAT', 'Subcategory for Clinical Observations', 'Char', 'Grouping Qualifier', 'Perm'),
    v('CLORRES', 'Result or Findings as Collected', 'Char', 'Result Qualifier', 'Exp'), v('CLSTRESC', 'Standardized Result in Character Format', 'Char', 'Result Qualifier', 'Exp'),
    v('CLSTAT', 'Completion Status', 'Char', 'Record Qualifier', 'Perm', 'ND'), v('CLREASND', 'Reason Not Done', 'Char', 'Record Qualifier', 'Perm'),
    v('CLLOC', 'Location of a Finding', 'Char', 'Record Qualifier', 'Exp'), v('CLSEV', 'Severity', 'Char', 'Record Qualifier', 'Perm'), v('CLUSCHFL', 'Unscheduled Flag', 'Char', 'Record Qualifier', 'Perm', 'NY'),
    v('VISITDY', 'Planned Study Day of Collection', 'Num', 'Timing', 'Perm'), v('CLDTC', 'Date/Time of Observation', 'Char', 'Timing', 'Exp'), v('CLDY', 'Study Day of Observation', 'Num', 'Timing', 'Perm'), ...NOM('CL'),
  ],
  MI: [
    ...ids('MI'), v('MIREFID', 'Specimen Reference Identifier', 'Char', 'Identifier', 'Perm'), v('MITESTCD', 'Microscopic Examination Short Name', 'Char', 'Topic', 'Req', 'MITESTCD'), v('MITEST', 'Microscopic Examination Name', 'Char', 'Synonym Qualifier', 'Req', 'MITEST'),
    v('MIORRES', 'Result or Findings as Collected', 'Char', 'Result Qualifier', 'Exp'), v('MISTRESC', 'Standardized Result in Character Format', 'Char', 'Result Qualifier', 'Exp', 'NONNEO'),
    v('MIRESCAT', 'Result Category', 'Char', 'Result Qualifier', 'Perm'), v('MICHRON', 'Chronicity of Finding', 'Char', 'Variable Qualifier', 'Exp'), v('MIDISTR', 'Distribution Pattern of Finding', 'Char', 'Variable Qualifier', 'Exp'),
    v('MISTAT', 'Completion Status', 'Char', 'Record Qualifier', 'Perm', 'ND'), v('MIREASND', 'Reason Not Done', 'Char', 'Record Qualifier', 'Perm'), v('MINAM', 'Laboratory Name', 'Char', 'Record Qualifier', 'Perm'),
    v('MISPEC', 'Specimen Material Type', 'Char', 'Record Qualifier', 'Req', 'SPEC'), v('MIANTREG', 'Anatomical Region of Specimen', 'Char', 'Variable Qualifier', 'Perm'),
    v('MISPCCND', 'Specimen Condition', 'Char', 'Record Qualifier', 'Exp'), v('MISPCUFL', 'Specimen Usability for the Test', 'Char', 'Record Qualifier', 'Exp', 'NY'),
    v('MILAT', 'Specimen Laterality within Subject', 'Char', 'Variable Qualifier', 'Perm', 'LAT'), v('MIEVAL', 'Evaluator', 'Char', 'Record Qualifier', 'Perm'),
    v('MISEV', 'Severity', 'Char', 'Record Qualifier', 'Exp', 'MISEV'), v('MIDTHREL', 'Relationship to Death', 'Char', 'Record Qualifier', 'Perm', 'NY'),
    v('MIDTC', 'Date/Time', 'Char', 'Timing', 'Perm'), v('MIDY', 'Study Day', 'Num', 'Timing', 'Perm'),
  ],
  OM: [
    ...ids('OM'), v('OMTESTCD', 'Test Short Name', 'Char', 'Topic', 'Req', 'OMTESTCD'), v('OMTEST', 'Test Name', 'Char', 'Synonym Qualifier', 'Req', 'OMTEST'),
    v('OMORRES', 'Result or Findings as Collected', 'Char', 'Result Qualifier', 'Exp'), v('OMORRESU', 'Unit of the Original Result', 'Char', 'Variable Qualifier', 'Exp', 'UNIT'),
    v('OMSTRESC', 'Standardized Result in Character Format', 'Char', 'Result Qualifier', 'Exp'), v('OMSTRESN', 'Standardized Result in Numeric Format', 'Num', 'Result Qualifier', 'Exp'), v('OMSTRESU', 'Unit of the Standardized Result', 'Char', 'Variable Qualifier', 'Exp', 'UNIT'),
    v('OMSTAT', 'Completion Status', 'Char', 'Record Qualifier', 'Perm', 'ND'), v('OMREASND', 'Reason Not Done', 'Char', 'Record Qualifier', 'Perm'),
    v('OMSPEC', 'Specimen Material Type', 'Char', 'Record Qualifier', 'Req', 'SPEC'), v('OMLAT', 'Specimen Laterality within Subject', 'Char', 'Variable Qualifier', 'Perm', 'LAT'),
    v('OMDTC', 'Date/Time Organ Measured', 'Char', 'Timing', 'Exp'), v('OMDY', 'Study Day of Measurement', 'Num', 'Timing', 'Perm'), ...NOM('OM'),
  ],
  TX: [
    v('STUDYID', 'Study Identifier', 'Char', 'Identifier', 'Req'), v('DOMAIN', 'Domain Abbreviation', 'Char', 'Identifier', 'Req', 'DOMAIN'), v('SETCD', 'Set Code', 'Char', 'Identifier', 'Req'),
    v('SET', 'Set Description', 'Char', 'Synonym Qualifier', 'Req'), v('TXSEQ', 'Sequence Number', 'Num', 'Identifier', 'Req'), v('TXPARMCD', 'Trial Set Parameter Short Name', 'Char', 'Topic', 'Req', 'TXPARMCD'),
    v('TXPARM', 'Trial Set Parameter', 'Char', 'Synonym Qualifier', 'Req', 'TXPARM'), v('TXVAL', 'Trial Set Parameter Value', 'Char', 'Result Qualifier', 'Req'),
  ],
}

export const isRel = (d: string) => /^(SUPP|NS)[A-Z]{2}$/.test(d)
export const relParent = (d: string) => d.replace(/^(SUPP|NS)/, '')
export const relName = (parent: string, ver: Version) => `${usesSupp(ver) ? 'SUPP' : 'NS'}${parent}`
export const dsName = (d: string, ver: Version) => (isRel(d) ? relName(relParent(d), ver) : d)
export const relMetaKey = (d: string) => (d.startsWith('NS') ? 'NSQUAL' : 'SUPPQUAL')
export const relLabel = (d: string) => (d.startsWith('NS') ? `Non-standard Variables for ${relParent(d)}` : `Supplemental Qualifiers for ${relParent(d)}`)
export const DETAIL_DOMAINS = Object.keys(META_34).filter((d) => !['SE', 'TA', 'TE', 'TV', 'TI', 'TS', 'SUPPQUAL', 'NSQUAL', 'RELREC'].includes(d))
export const TRIAL_DESIGN = ['TA', 'TE', 'TV', 'TI', 'TS']
// The domains a project can map, and browse, under its standard.
export const detailDomains = (ver: Version) => (ver === 'send' ? Object.keys(META_SEND) : DETAIL_DOMAINS)
export const domainsFor = (ver: Version) => (ver === 'send' ? SEND_DOMAINS : DOMAINS)
export const hasMeta = (d: string, ver?: Version) => (ver === 'send' ? !!META_SEND[d] : !!META_34[d])

// The SDTMIG v4.0 public-review draft, as CDISC presented it in February 2026: SUBJID in every
// general-observation-class domain, --BLFL retired in favour of --LOBXFL, collected race and
// ethnicity (CRACE, CETHNIC) in DM, and SUPPQUAL replaced by non-standard variable datasets
// (NS--). Core status of new variables is shown as in the draft and must be checked against the
// final standard when CDISC publishes it.
const GENERAL = new Set(DOMAINS.filter((d) => ['Interventions', 'Events', 'Findings', 'Findings About'].includes(d.cls)).map((d) => d.code))
export const DRAFT_CHANGES: { what: string; where: string }[] = [
  { what: 'SUBJID added after USUBJID in every Interventions, Events and Findings domain', where: 'VS, EX, AE, CM, DS and all other general-class domains' },
  { what: '--BLFL (Baseline Flag) retired; --LOBXFL (Last Observation Before Exposure Flag) carries the pre-treatment flag', where: 'Findings domains, e.g. VSBLFL' },
  { what: 'CRACE (Collected Race) and CETHNIC (Collected Ethnicity) added', where: 'DM' },
  { what: 'Supplemental qualifiers (SUPP--) replaced by non-standard variable datasets (NS--): one horizontal record per parent record, each non-standard variable a column (character or numeric), linked by IDVAR = --SEQ and the numeric IDVARVLN; in NSDM, IDVAR and IDVARVLN are null', where: 'NSAE, NSDM and the other relationship datasets: built by the trainer in draft mode' },
  { what: 'New domains, including DC, EA and GI', where: 'Not used by this study' },
]

// Sponsor-defined (custom) domains of the open project, registered when it loads.
export interface CustomDomain { code: string; name: string; cls: 'Interventions' | 'Events' | 'Findings'; structure: string; reason: string; vars: VarMeta[] }
const CUSTOM: Record<string, CustomDomain> = {}
export function registerCustom(list: CustomDomain[] = []) { for (const k of Object.keys(CUSTOM)) delete CUSTOM[k]; for (const c of list) CUSTOM[c.code] = c }
export const customDomains = () => Object.values(CUSTOM)
// The reference custom domain, so missions can build the hidden reference even before the
// learner has defined it; it is not offered in the interface.
const REF_CUSTOM: Record<string, CustomDomain> = {}
export function registerReferenceCustom(c: CustomDomain) { REF_CUSTOM[c.code] = c }
// The general observation class variables a custom domain is built from (SDTM v2.0), with the
// domain prefix in place of --.
export function customVars(code: string, cls: CustomDomain['cls']): VarMeta[] {
  const x = (n: string) => n.replace('--', code)
  const common = [v('STUDYID', 'Study Identifier', 'Char', 'Identifier', 'Req'), v('DOMAIN', 'Domain Abbreviation', 'Char', 'Identifier', 'Req'), v('USUBJID', 'Unique Subject Identifier', 'Char', 'Identifier', 'Req'), v(x('--SEQ'), 'Sequence Number', 'Num', 'Identifier', 'Req'), v(x('--SPID'), 'Sponsor-Defined Identifier', 'Char', 'Identifier', 'Perm')]
  const timing = [v('VISITNUM', 'Visit Number', 'Num', 'Timing', 'Perm'), v('VISIT', 'Visit Name', 'Char', 'Timing', 'Perm'), v('EPOCH', 'Epoch', 'Char', 'Timing', 'Perm', 'EPOCH')]
  if (cls === 'Interventions') return [...common, v(x('--TRT'), 'Name of Treatment', 'Char', 'Topic', 'Req'), v(x('--CAT'), 'Category', 'Char', 'Grouping Qualifier', 'Perm'), v(x('--SCAT'), 'Subcategory', 'Char', 'Grouping Qualifier', 'Perm'), v(x('--DOSE'), 'Dose', 'Num', 'Record Qualifier', 'Perm'), v(x('--DOSU'), 'Dose Units', 'Char', 'Variable Qualifier', 'Perm', 'UNIT'), ...timing, v(x('--STDTC'), 'Start Date/Time', 'Char', 'Timing', 'Exp'), v(x('--ENDTC'), 'End Date/Time', 'Char', 'Timing', 'Perm'), v(x('--STDY'), 'Study Day of Start', 'Num', 'Timing', 'Perm'), v(x('--ENDY'), 'Study Day of End', 'Num', 'Timing', 'Perm'), v(x('--DUR'), 'Duration', 'Char', 'Timing', 'Perm')]
  if (cls === 'Events') return [...common, v(x('--TERM'), 'Reported Term', 'Char', 'Topic', 'Req'), v(x('--DECOD'), 'Dictionary-Derived Term', 'Char', 'Synonym Qualifier', 'Perm'), v(x('--CAT'), 'Category', 'Char', 'Grouping Qualifier', 'Perm'), v(x('--SCAT'), 'Subcategory', 'Char', 'Grouping Qualifier', 'Perm'), v(x('--SEV'), 'Severity/Intensity', 'Char', 'Record Qualifier', 'Perm'), ...timing, v(x('--STDTC'), 'Start Date/Time', 'Char', 'Timing', 'Exp'), v(x('--ENDTC'), 'End Date/Time', 'Char', 'Timing', 'Perm'), v(x('--STDY'), 'Study Day of Start', 'Num', 'Timing', 'Perm'), v(x('--ENDY'), 'Study Day of End', 'Num', 'Timing', 'Perm')]
  return [...common, v(x('--TESTCD'), 'Short Name of Test', 'Char', 'Topic', 'Req'), v(x('--TEST'), 'Name of Test', 'Char', 'Synonym Qualifier', 'Req'), v(x('--CAT'), 'Category', 'Char', 'Grouping Qualifier', 'Perm'), v(x('--ORRES'), 'Result in Original Units', 'Char', 'Result Qualifier', 'Exp'), v(x('--ORRESU'), 'Original Units', 'Char', 'Variable Qualifier', 'Perm', 'UNIT'), v(x('--STRESC'), 'Result in Standard Format', 'Char', 'Result Qualifier', 'Exp'), v(x('--STRESN'), 'Numeric Result in Standard Units', 'Num', 'Result Qualifier', 'Perm'), v(x('--STRESU'), 'Standard Units', 'Char', 'Variable Qualifier', 'Perm', 'UNIT'), v(x('--STAT'), 'Completion Status', 'Char', 'Record Qualifier', 'Perm', 'ND'), v(x('--REASND'), 'Reason Not Done', 'Char', 'Record Qualifier', 'Perm'), ...timing, v(x('--DTC'), 'Date/Time of Collection', 'Char', 'Timing', 'Exp'), v(x('--DY'), 'Study Day of Collection', 'Num', 'Timing', 'Perm')]
}
// Which standard domains might hold the data a custom domain is proposed for: SDTMIG allows a
// custom domain only when no published domain fits.
const FIT_WORDS: [RegExp, string[]][] = [
  [/question|scale|score|survey|instrument|diary/i, ['QS']], [/procedure|surgery|operation|biopsy/i, ['PR']], [/meal|food|nutrition|diet/i, ['ML']],
  [/vital|blood pressure|pulse|weight|height|temperature/i, ['VS']], [/lab|blood test|urine|chemistry|haematology|hematology/i, ['LB']], [/ecg|electrocardio/i, ['EG']],
  [/medication|drug|dose|tablet|treatment/i, ['CM', 'EX', 'EC']], [/device/i, ['DI', 'DU', 'DO']], [/tobacco|smok|alcohol|substance|caffeine/i, ['SU']],
  [/pregnan|reproductive|menstrua/i, ['RP']], [/micro|culture|organism/i, ['MB', 'MS']], [/pharmacokinetic|concentration/i, ['PC', 'PP']],
  [/hospital|admission|visit to|encounter/i, ['HO']], [/death|autopsy/i, ['DD']], [/tumou?r|lesion|response/i, ['TU', 'TR', 'RS']], [/physical exam|examination/i, ['PE']],
  [/history|condition/i, ['MH']], [/adverse|side effect/i, ['AE']], [/deviation/i, ['DV']], [/comment/i, ['CO']], [/eligib|criteri/i, ['IE']], [/social|economic|employ|education level/i, ['SC']],
]
export function standardCandidates(text: string): string[] { return [...new Set(FIT_WORDS.filter(([re]) => re.test(text)).flatMap(([, d]) => d))] }
export function customCodeProblem(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return 'A domain code is two capital letters'
  if (DOMAINS.some((d) => d.code === code) || ['SUPPQUAL', 'RELREC'].includes(code)) return `${code} is a standard domain`
  if (!/^[XYZ]/.test(code)) return 'Custom domain codes start with X, Y or Z: CDISC reserves those letters for sponsor-defined domains'
  return ''
}

export function varsOf(domain: string, ver: Version): VarMeta[] {
  if (ver === 'send') return META_SEND[domain] ?? CUSTOM[domain]?.vars ?? []
  const base = META_34[domain] ?? CUSTOM[domain]?.vars ?? REF_CUSTOM[domain]?.vars ?? []
  if (ver === '3.4') return base
  let out = base.filter((x) => !(x.name.length > 2 && x.name.endsWith('BLFL') && x.name.startsWith(domain)))
  if ((GENERAL.has(domain) || CUSTOM[domain] || REF_CUSTOM[domain]) && !out.some((x) => x.name === 'SUBJID')) {
    const i = out.findIndex((x) => x.name === 'USUBJID') + 1
    out = [...out.slice(0, i), { ...v('SUBJID', 'Subject Identifier for the Study', 'Char', 'Identifier', 'Perm'), draft: true, note: 'Added in the v4.0 draft; check core status in the final standard' }, ...out.slice(i)]
  }
  if (domain === 'DM') {
    const i = out.findIndex((x) => x.name === 'ETHNIC') + 1
    out = [...out.slice(0, i), { ...v('CRACE', 'Collected Race', 'Char', 'Record Qualifier', 'Perm'), draft: true, note: 'v4.0 draft' }, { ...v('CETHNIC', 'Collected Ethnicity', 'Char', 'Record Qualifier', 'Perm'), draft: true, note: 'v4.0 draft' }, ...out.slice(i)]
  }
  return out
}
export const metaOf = (domain: string, name: string, ver: Version) => varsOf(domain, ver).find((x) => x.name === name)
export const domainInfo = (code: string, ver?: Version): DomainInfo | undefined => (ver === 'send' ? SEND_DOMAINS.find((d) => d.code === code) : undefined) ?? DOMAINS.find((d) => d.code === code) ?? SEND_DOMAINS.find((d) => d.code === code) ?? (CUSTOM[code] ? { code, name: `${CUSTOM[code].name} (custom)`, cls: CUSTOM[code].cls, structure: CUSTOM[code].structure, detail: true } : undefined)

// ---------- controlled terminology (bundled subset) ----------
// CDISC Controlled Terminology is published quarterly through NCI EVS. The trainer bundles the
// codelists its study needs, stamped with the release they were taken from. Submission values
// are case-sensitive and must be used exactly.
export const BUNDLED_CT_LABEL = 'CDISC SDTM Controlled Terminology, 2026-09 release (subset bundled for this study)'
// The terminology in use: the bundled subset, or a full NCI EVS file the learner loaded (ctload.ts).
export const CT_INFO = { label: BUNDLED_CT_LABEL, loaded: false }
export interface Codelist { id: string; name: string; extensible: boolean; terms: { value: string; decode?: string }[] }
const cl = (id: string, name: string, extensible: boolean, terms: (string | [string, string])[]): Codelist => ({ id, name, extensible, terms: terms.map((t) => (typeof t === 'string' ? { value: t } : { value: t[0], decode: t[1] })) })

export const CT: Record<string, Codelist> = Object.fromEntries([
  cl('NY', 'No Yes Response', false, [['N', 'No'], ['Y', 'Yes'], ['U', 'Unknown'], ['NA', 'Not Applicable']]),
  cl('SEX', 'Sex', false, [['F', 'Female'], ['M', 'Male'], ['U', 'Unknown'], ['INTERSEX', 'Intersex']]),
  cl('RACE', 'Race', true, ['AMERICAN INDIAN OR ALASKA NATIVE', 'ASIAN', 'BLACK OR AFRICAN AMERICAN', 'NATIVE HAWAIIAN OR OTHER PACIFIC ISLANDER', 'WHITE', 'MULTIPLE', 'NOT REPORTED', 'UNKNOWN', 'OTHER']),
  cl('ETHNIC', 'Ethnic Group', false, ['HISPANIC OR LATINO', 'NOT HISPANIC OR LATINO', 'NOT REPORTED', 'UNKNOWN']),
  cl('AGEU', 'Age Unit', false, ['YEARS', 'MONTHS', 'WEEKS', 'DAYS', 'HOURS']),
  cl('ARMNULRS', 'Arm Null Reason', true, ['ASSIGNED, NOT TREATED', 'NOT ASSIGNED', 'SCREEN FAILURE', 'UNPLANNED TREATMENT']),
  cl('COUNTRY', 'Country (ISO 3166-1 alpha-3)', false, [['USA', 'United States'], ['JPN', 'Japan'], ['DEU', 'Germany'], ['IND', 'India'], ['BRA', 'Brazil'], ['GBR', 'United Kingdom'], ['MEX', 'Mexico'], ['CAN', 'Canada'], ['ESP', 'Spain'], ['POL', 'Poland'], ['AUS', 'Australia'], ['FRA', 'France']]),
  cl('VSTESTCD', 'Vital Signs Test Code', true, [['SYSBP', 'Systolic Blood Pressure'], ['DIABP', 'Diastolic Blood Pressure'], ['PULSE', 'Pulse Rate'], ['WEIGHT', 'Weight'], ['HEIGHT', 'Height'], ['BMI', 'Body Mass Index'], ['TEMP', 'Temperature']]),
  cl('VSTEST', 'Vital Signs Test Name', true, ['Systolic Blood Pressure', 'Diastolic Blood Pressure', 'Pulse Rate', 'Weight', 'Height', 'Body Mass Index', 'Temperature']),
  cl('VSRESU', 'Units for Vital Signs Results', true, ['mmHg', 'beats/min', 'kg', 'LB', 'cm', 'in', 'kg/m2', 'C', 'F']),
  cl('UNIT', 'Unit', true, ['mg', 'g', 'mL', 'mg/kg', 'mg/kg/day', 'mL/kg', 'U', 'msec', 'beats/min', 'TABLET', 'CAPSULE', 'kg', 'cm', 'mm', '%', 'mg/dL', 'mmol/L', 'umol/L', 'U/L', 'mmol/mol', 'ng/mL', 'mg/m2', 'Gy', 'L', 'ug', 'C', 'titer']),
  cl('POSITION', 'Position', true, ['SITTING', 'STANDING', 'SUPINE']),
  cl('ND', 'Not Done', false, ['NOT DONE']),
  cl('LOC', 'Anatomical Location', true, ['ARM', 'DELTOID MUSCLE', 'ORAL CAVITY', 'LUNG', 'LIVER', 'LYMPH NODE', 'ADRENAL GLAND', 'BONE', 'BRAIN', 'PLEURA', 'CHEST WALL']),
  cl('METHOD', 'Method', true, ['CT SCAN', 'MRI', 'X-RAY', 'PET SCAN', 'PHYSICAL EXAMINATION']),
  cl('EVAL', 'Evaluator', true, ['INVESTIGATOR', 'INDEPENDENT ASSESSOR', 'ADJUDICATION COMMITTEE']),
  cl('TUTESTCD', 'Tumor or Lesion Identification Test Code', true, [['TUMIDENT', 'Tumor Identification']]),
  cl('TUTEST', 'Tumor or Lesion Identification Test Name', true, ['Tumor Identification']),
  cl('TUIDRS', 'Tumor or Lesion Identification Test Results', true, ['TARGET', 'NON-TARGET', 'NEW']),
  cl('TRTESTCD', 'Tumor or Lesion Properties Test Code', true, [['LDIAM', 'Longest Diameter'], ['SAXIS', 'Short Axis'], ['SUMDIAM', 'Sum of Diameter'], ['TUMSTATE', 'Tumor State']]),
  cl('TRTEST', 'Tumor or Lesion Properties Test Name', true, ['Longest Diameter', 'Short Axis', 'Sum of Diameter', 'Tumor State']),
  cl('ONCRTSCD', 'Oncology Response Assessment Test Code', true, [['TRGRESP', 'Target Response'], ['NTRGRESP', 'Non-target Response'], ['NEWLPROG', 'New Lesion Progression'], ['OVRLRESP', 'Overall Response']]),
  cl('ONCRTS', 'Oncology Response Assessment Test Name', true, ['Target Response', 'Non-target Response', 'New Lesion Progression', 'Overall Response']),
  cl('ONCRSR', 'Oncology Response Assessment Result', true, ['CR', 'PR', 'SD', 'PD', 'NE', 'NON-CR/NON-PD', 'Y', 'N']),
  cl('RETESTCD', 'Respiratory Test Code', true, [['FEV1', 'Forced Expiratory Volume in 1 Second'], ['FVC', 'Forced Vital Capacity'], ['FEV1FVC', 'FEV1/FVC'], ['FEV1PP', 'Percent Predicted FEV1']]),
  cl('RETEST', 'Respiratory Test Name', true, ['Forced Expiratory Volume in 1 Second', 'Forced Vital Capacity', 'FEV1/FVC', 'Percent Predicted FEV1']),
  cl('ASDSTC', 'Airway Symptom Diary Score Test Code (fictional instrument)', false, [['ASDS01', 'ASDS1-Daytime Wheeze'], ['ASDS02', 'ASDS1-Night-time Waking'], ['ASDS03', 'ASDS1-Breathless on Exertion'], ['ASDS04', 'ASDS1-Chest Tightness'], ['ASDS05', 'ASDS1-Reliever Use'], ['ASDSTOT', 'ASDS1-Total Score']]),
  cl('FATESTCD', 'Findings About Test Code', true, [['OCCUR', 'Occurrence Indicator'], ['SEV', 'Severity/Intensity'], ['LDIAM', 'Longest Diameter'], ['CECENDPT', 'Endpoint Event per CEC'], ['CECCAT', 'CEC Adjudicated Category']]),
  cl('FATEST', 'Findings About Test Name', true, ['Occurrence Indicator', 'Severity/Intensity', 'Longest Diameter', 'Endpoint Event per CEC', 'CEC Adjudicated Category']),
  cl('DTHDXCD', 'Death Details Test Code', true, [['PRCDTH', 'Primary Cause of Death']]),
  cl('DTHDX', 'Death Details Test Name', true, ['Primary Cause of Death']),
  cl('LAT', 'Laterality', true, ['LEFT', 'RIGHT', 'BILATERAL']),
  cl('EPOCH', 'Epoch', true, ['SCREENING', 'RUN-IN', 'TREATMENT', 'FOLLOW-UP']),
  cl('FRM', 'Pharmaceutical Dosage Form', true, ['TABLET', 'CAPSULE', 'SOLUTION', 'SUSPENSION', 'INJECTION, SOLUTION', 'POWDER, METERED', 'INJECTION, SUSPENSION']),
  cl('FREQ', 'Frequency', true, ['QD', 'BID', 'TID', 'PRN', 'ONCE']),
  cl('ROUTE', 'Route of Administration', true, ['ORAL', 'INTRAVENOUS', 'SUBCUTANEOUS', 'INTRAMUSCULAR', 'TOPICAL', 'RESPIRATORY (INHALATION)', 'ORAL GAVAGE']),
  cl('AESEV', 'Severity/Intensity Scale for Adverse Events', false, ['MILD', 'MODERATE', 'SEVERE']),
  cl('ACN', 'Action Taken with Study Treatment', false, ['DOSE INCREASED', 'DOSE NOT CHANGED', 'DOSE REDUCED', 'DRUG INTERRUPTED', 'DRUG WITHDRAWN', 'NOT APPLICABLE', 'UNKNOWN']),
  cl('OUT', 'Outcome of Event', false, ['FATAL', 'NOT RECOVERED/NOT RESOLVED', 'RECOVERED/RESOLVED', 'RECOVERED/RESOLVED WITH SEQUELAE', 'RECOVERING/RESOLVING', 'UNKNOWN']),
  cl('NCOMPLT', 'Completion/Reason for Non-Completion', true, ['COMPLETED', 'ADVERSE EVENT', 'DEATH', 'LOST TO FOLLOW-UP', 'PHYSICIAN DECISION', 'PROTOCOL DEVIATION', 'SCREEN FAILURE', 'STUDY TERMINATED BY SPONSOR', 'WITHDRAWAL BY SUBJECT']),
  cl('PROTMLST', 'Protocol Milestone', true, ['INFORMED CONSENT OBTAINED', 'RANDOMIZED', 'ELIGIBILITY CRITERIA MET']),
  cl('DSCAT', 'Category for Disposition Event', false, ['DISPOSITION EVENT', 'PROTOCOL MILESTONE', 'OTHER EVENT']),
  cl('STENRF', 'Relation to Reference Period', false, ['BEFORE', 'DURING', 'AFTER', 'DURING/AFTER', 'U', 'ONGOING']),
  cl('LBTESTCD', 'Laboratory Test Code', true, [['HBA1C', 'Hemoglobin A1C'], ['GLUC', 'Glucose'], ['CREAT', 'Creatinine'], ['ALT', 'Alanine Aminotransferase'], ['AST', 'Aspartate Aminotransferase'], ['CHOL', 'Cholesterol']]),
  cl('LBTEST', 'Laboratory Test Name', true, ['Hemoglobin A1C', 'Glucose', 'Creatinine', 'Alanine Aminotransferase', 'Aspartate Aminotransferase', 'Cholesterol']),
  cl('NRIND', 'Reference Range Indicator', true, ['NORMAL', 'LOW', 'HIGH', 'ABNORMAL']),
  cl('SPECCOND', 'Specimen Condition', true, ['HEMOLYZED', 'LIPEMIC', 'ICTERIC', 'CLOTTED']),
  cl('PKPARMCD', 'PK Parameters Code', true, [['CMAX', 'Max Conc'], ['TMAX', 'Time of CMAX'], ['AUCLST', 'AUC to Last Nonzero Conc'], ['AUCIFO', 'AUC Infinity Obs'], ['AUCTAU', 'AUC Over Dosing Interval'], ['LAMZHL', 'Half-Life Lambda z'], ['CTROUGH', 'Trough Concentration']]),
  cl('PKPARM', 'PK Parameters', true, ['Max Conc', 'Time of CMAX', 'AUC to Last Nonzero Conc', 'AUC Infinity Obs', 'AUC Over Dosing Interval', 'Half-Life Lambda z', 'Trough Concentration']),
  cl('PKUNIT', 'PK Units of Measure', true, ['ng/mL', 'h', 'h*ng/mL', 'ug/mL', 'h*ug/mL', 'L', 'L/h']),
  cl('SPECTYPE', 'Specimen Type', true, ['BLOOD', 'CAPILLARY BLOOD', 'SERUM', 'PLASMA', 'URINE']),
  cl('IECAT', 'Category for Inclusion/Exclusion', false, ['INCLUSION', 'EXCLUSION']),
  cl('INTMODEL', 'Intervention Model', true, ['PARALLEL', 'CROSS-OVER', 'SINGLE GROUP', 'FACTORIAL', 'SEQUENTIAL']),
  cl('INTTYPE', 'Intervention Type', true, ['DRUG', 'BIOLOGIC', 'DEVICE', 'PROCEDURE', 'DIETARY SUPPLEMENT', 'BEHAVIORAL']),
  cl('TSPARMCD', 'Trial Summary Parameter Test Code', true, [['TITLE', 'Trial Title'], ['TPHASE', 'Trial Phase Classification'], ['STYPE', 'Study Type'], ['TTYPE', 'Trial Type'], ['INDIC', 'Trial Disease/Condition Indication'], ['TRT', 'Investigational Therapy or Treatment'], ['COMPTRT', 'Comparative Treatment Name'], ['TBLIND', 'Trial Blinding Schema'], ['TCNTRL', 'Control Type'], ['TINDTP', 'Trial Intent Type'], ['RANDOM', 'Trial is Randomized'], ['ADDON', 'Added on to Existing Treatments'], ['NARMS', 'Planned Number of Arms'], ['PLANSUB', 'Planned Number of Subjects'], ['ACTSUB', 'Actual Number of Subjects'], ['AGEMIN', 'Planned Minimum Age of Subjects'], ['AGEMAX', 'Planned Maximum Age of Subjects'], ['SEXPOP', 'Sex of Participants'], ['HLTSUBJI', 'Healthy Subject Indicator'], ['LENGTH', 'Trial Length'], ['FCNTRY', 'Planned Country of Investigational Sites'], ['SPONSOR', 'Clinical Study Sponsor'], ['SSTDTC', 'Study Start Date'], ['SENDTC', 'Study End Date'], ['SDTMVER', 'SDTM Version'], ['SDTIGVER', 'SDTM IG Version'], ['CURTRT', 'Current Therapy or Treatment'], ['PCLAS', 'Pharmacologic Class'], ['REGID', 'Registry Identifier'], ['ADAPT', 'Adaptive Design'], ['INTMODEL', 'Intervention Model'], ['INTTYPE', 'Intervention Type'], ['OBJPRIM', 'Trial Primary Objective'], ['OBJSEC', 'Trial Secondary Objective'], ['OUTMSPRI', 'Primary Outcome Measure'], ['STOPRULE', 'Study Stop Rules'], ['DCUTDTC', 'Data Cutoff Date'], ['DCUTDESC', 'Data Cutoff Description']]),
  cl('TSPARM', 'Trial Summary Parameter Test Name', true, ['Trial Title', 'Trial Phase Classification', 'Study Type', 'Trial Type', 'Trial Disease/Condition Indication', 'Investigational Therapy or Treatment', 'Comparative Treatment Name', 'Trial Blinding Schema', 'Control Type', 'Trial Intent Type', 'Trial is Randomized', 'Added on to Existing Treatments', 'Planned Number of Arms', 'Planned Number of Subjects', 'Actual Number of Subjects', 'Planned Minimum Age of Subjects', 'Planned Maximum Age of Subjects', 'Sex of Participants', 'Healthy Subject Indicator', 'Trial Length', 'Planned Country of Investigational Sites', 'Clinical Study Sponsor', 'Study Start Date', 'Study End Date', 'SDTM Version', 'SDTM IG Version', 'Current Therapy or Treatment', 'Pharmacologic Class', 'Registry Identifier', 'Adaptive Design', 'Intervention Model', 'Intervention Type', 'Trial Primary Objective', 'Trial Secondary Objective', 'Primary Outcome Measure', 'Study Stop Rules', 'Data Cutoff Date', 'Data Cutoff Description']),
  cl('TPHASE', 'Trial Phase Response', true, ['PHASE I TRIAL', 'PHASE II TRIAL', 'PHASE III TRIAL', 'PHASE IV TRIAL']),
  cl('STYPE', 'Study Type Response', true, ['INTERVENTIONAL', 'OBSERVATIONAL']),
  cl('TTYPE', 'Trial Type Response', true, ['EFFICACY', 'SAFETY', 'PHARMACOKINETIC', 'PHARMACODYNAMIC']),
  cl('TBLIND', 'Trial Blinding Schema Response', true, ['DOUBLE BLIND', 'OPEN LABEL', 'SINGLE BLIND']),
  cl('TCNTRL', 'Control Type Response', true, ['PLACEBO', 'ACTIVE', 'NONE', 'VEHICLE CONTROL']),
  cl('TINDTP', 'Trial Intent Type Response', true, ['TREATMENT', 'PREVENTION', 'DIAGNOSIS']),
  cl('SEXPOP', 'Sex of Study Group Response', false, ['BOTH', 'F', 'M']),
  cl('DOMAIN', 'SDTM Domain Abbreviation', true, [...new Set([...DOMAINS, ...SEND_DOMAINS].filter((d) => /^[A-Z]{2}$/.test(d.code)).map((d) => d.code))]),
  cl('EGTESTCD', 'ECG Test Code', true, [['EGHRMN', 'ECG Mean Heart Rate'], ['PRAG', 'PR Interval, Aggregate'], ['QRSAG', 'QRS Duration, Aggregate'], ['QTAG', 'QT Interval, Aggregate'], ['QTCFAG', 'QTcF Interval, Aggregate'], ['INTP', 'Interpretation']]),
  cl('EGTEST', 'ECG Test Name', true, ['ECG Mean Heart Rate', 'PR Interval, Aggregate', 'QRS Duration, Aggregate', 'QT Interval, Aggregate', 'QTcF Interval, Aggregate', 'Interpretation']),
  cl('EGMETHOD', 'ECG Test Method', true, ['12 LEAD STANDARD']),
  // SEND terminology used by the nonclinical study (CDISC SEND Controlled Terminology, subset).
  cl('SPECIES', 'Species', true, ['RAT', 'MOUSE', 'DOG', 'MONKEY', 'RABBIT', 'MINIPIG']),
  cl('STRAIN', 'Strain/Substrain', true, ['SPRAGUE-DAWLEY', 'WISTAR', 'WISTAR HAN', 'BEAGLE', 'CD-1']),
  cl('BWTESTCD', 'Body Weight Test Code', false, [['BW', 'Body Weight'], ['TERMBW', 'Terminal Body Weight']]),
  cl('BWTEST', 'Body Weight Test Name', false, ['Body Weight', 'Terminal Body Weight']),
  cl('CLCAT', 'Category for Clinical Observations', true, ['CLINICAL SIGNS', 'PHYSICAL EXAM', 'OPHTHALMOLOGY']),
  cl('MITESTCD', 'Microscopic Examination Test Code', true, [['MIEXAM', 'Microscopic Examination']]),
  cl('MITEST', 'Microscopic Examination Test Name', true, ['Microscopic Examination']),
  cl('NONNEO', 'Non-Neoplastic Finding Type', true, ['UNREMARKABLE', 'HYPERTROPHY, HEPATOCELLULAR', 'INFILTRATE, MONONUCLEAR CELL', 'NECROSIS', 'VACUOLATION']),
  cl('MISEV', 'Severity (SEND)', false, ['MINIMAL', 'MILD', 'MODERATE', 'MARKED', 'SEVERE']),
  cl('OMTESTCD', 'Organ Measurement Test Code', true, [['WEIGHT', 'Weight'], ['OWBW', 'Organ to Body Weight Ratio'], ['OWBR', 'Organ to Brain Weight Ratio']]),
  cl('OMTEST', 'Organ Measurement Test Name', true, ['Weight', 'Organ to Body Weight Ratio', 'Organ to Brain Weight Ratio']),
  cl('SPEC', 'Specimen Type', true, ['LIVER', 'KIDNEY', 'HEART', 'SPLEEN', 'BRAIN', 'STOMACH', 'SERUM', 'BLOOD', 'URINE']),
  cl('TXPARMCD', 'Trial Set Parameter Short Name', true, [['ARMCD', 'Arm Code'], ['SPGRPCD', 'Sponsor-Defined Group Code'], ['GRPLBL', 'Group Label'], ['TRTDOS', 'Dose Level'], ['TRTDOSU', 'Dose Units'], ['SEXPOP', 'Sex of Participants'], ['PLANMSUB', 'Planned Number of Male Subjects'], ['PLANFSUB', 'Planned Number of Female Subjects'], ['TCNTRL', 'Control Type'], ['SPECIES', 'Species'], ['STRAIN', 'Strain/Substrain'], ['SETLBL', 'Set Label']]),
  cl('TXPARM', 'Trial Set Parameter', true, ['Arm Code', 'Sponsor-Defined Group Code', 'Group Label', 'Dose Level', 'Dose Units', 'Sex of Participants', 'Planned Number of Male Subjects', 'Planned Number of Female Subjects', 'Control Type', 'Species', 'Strain/Substrain', 'Set Label']),
].map((c) => [c.id, c]))
export const inCt = (id: string, value: string) => !!CT[id]?.terms.some((t) => t.value === value)
export const decode = (id: string, value: string) => CT[id]?.terms.find((t) => t.value === value)?.decode ?? ''
