// Standards metadata: SDTM v2.0 with SDTMIG v3.4 (the version FDA requires for studies starting
// on or after 15 March 2025), and an "SDTMIG v4.0 draft" mode built from the public-review draft
// (February to April 2026). Variable names, labels, types, roles and core status follow the
// published implementation guide for the domains this trainer maps; the domain list covers the
// whole guide so learners can browse it. CDISC publishes these standards openly.

export type Version = '3.4' | '4.0d'
export const VERSION_LABEL: Record<Version, string> = { '3.4': 'SDTM v2.0 · SDTMIG v3.4', '4.0d': 'SDTM v3.0 · SDTMIG v4.0 draft (public review, 2026)' }

export type Cls = 'Special-Purpose' | 'Interventions' | 'Events' | 'Findings' | 'Findings About' | 'Trial Design' | 'Relationship' | 'Study Reference'
export interface DomainInfo { code: string; name: string; cls: Cls; structure?: string; detail?: boolean }

export const DOMAINS: DomainInfo[] = [
  { code: 'CO', name: 'Comments', cls: 'Special-Purpose' },
  { code: 'DM', name: 'Demographics', cls: 'Special-Purpose', structure: 'One record per subject', detail: true },
  { code: 'SE', name: 'Subject Elements', cls: 'Special-Purpose', structure: 'One record per actual Element per subject' },
  { code: 'SM', name: 'Subject Disease Milestones', cls: 'Special-Purpose' },
  { code: 'SV', name: 'Subject Visits', cls: 'Special-Purpose', structure: 'One record per actual or planned visit per subject', detail: true },
  { code: 'AG', name: 'Procedure Agents', cls: 'Interventions' },
  { code: 'CM', name: 'Concomitant/Prior Medications', cls: 'Interventions', structure: 'One record per recorded intervention occurrence or constant-dosing interval per subject', detail: true },
  { code: 'EC', name: 'Exposure as Collected', cls: 'Interventions' },
  { code: 'EX', name: 'Exposure', cls: 'Interventions', structure: 'One record per protocol-specified study treatment, constant-dosing interval, per subject', detail: true },
  { code: 'ML', name: 'Meal Data', cls: 'Interventions' },
  { code: 'PR', name: 'Procedures', cls: 'Interventions' },
  { code: 'SU', name: 'Substance Use', cls: 'Interventions' },
  { code: 'AE', name: 'Adverse Events', cls: 'Events', structure: 'One record per adverse event per subject', detail: true },
  { code: 'BE', name: 'Biospecimen Events', cls: 'Events' },
  { code: 'CE', name: 'Clinical Events', cls: 'Events' },
  { code: 'DS', name: 'Disposition', cls: 'Events', structure: 'One record per disposition status or protocol milestone per subject', detail: true },
  { code: 'DV', name: 'Protocol Deviations', cls: 'Events' },
  { code: 'HO', name: 'Healthcare Encounters', cls: 'Events' },
  { code: 'MH', name: 'Medical History', cls: 'Events' },
  { code: 'BS', name: 'Biospecimen Findings', cls: 'Findings' },
  { code: 'CP', name: 'Cell Phenotype Findings', cls: 'Findings' },
  { code: 'CV', name: 'Cardiovascular System Findings', cls: 'Findings' },
  { code: 'DA', name: 'Product Accountability', cls: 'Findings' },
  { code: 'DD', name: 'Death Details', cls: 'Findings' },
  { code: 'EG', name: 'ECG Test Results', cls: 'Findings' },
  { code: 'FT', name: 'Functional Tests', cls: 'Findings' },
  { code: 'GF', name: 'Genomics Findings', cls: 'Findings' },
  { code: 'IE', name: 'Inclusion/Exclusion Criteria Not Met', cls: 'Findings' },
  { code: 'IS', name: 'Immunogenicity Specimen Assessments', cls: 'Findings' },
  { code: 'LB', name: 'Laboratory Test Results', cls: 'Findings' },
  { code: 'MB', name: 'Microbiology Specimen', cls: 'Findings' },
  { code: 'MI', name: 'Microscopic Findings', cls: 'Findings' },
  { code: 'MK', name: 'Musculoskeletal System Findings', cls: 'Findings' },
  { code: 'MS', name: 'Microbiology Susceptibility', cls: 'Findings' },
  { code: 'NV', name: 'Nervous System Findings', cls: 'Findings' },
  { code: 'OE', name: 'Ophthalmic Examinations', cls: 'Findings' },
  { code: 'PC', name: 'Pharmacokinetics Concentrations', cls: 'Findings' },
  { code: 'PE', name: 'Physical Examination', cls: 'Findings' },
  { code: 'PP', name: 'Pharmacokinetics Parameters', cls: 'Findings' },
  { code: 'QS', name: 'Questionnaires', cls: 'Findings' },
  { code: 'RE', name: 'Respiratory System Findings', cls: 'Findings' },
  { code: 'RP', name: 'Reproductive System Findings', cls: 'Findings' },
  { code: 'RS', name: 'Disease Response and Clin Classification', cls: 'Findings' },
  { code: 'SC', name: 'Subject Characteristics', cls: 'Findings' },
  { code: 'SS', name: 'Subject Status', cls: 'Findings' },
  { code: 'TR', name: 'Tumor/Lesion Results', cls: 'Findings' },
  { code: 'TU', name: 'Tumor/Lesion Identification', cls: 'Findings' },
  { code: 'UR', name: 'Urinary System Findings', cls: 'Findings' },
  { code: 'VS', name: 'Vital Signs', cls: 'Findings', structure: 'One record per vital sign measurement per time point per visit per subject', detail: true },
  { code: 'FA', name: 'Findings About Events or Interventions', cls: 'Findings About' },
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

export type Core = 'Req' | 'Exp' | 'Perm'
export type Role = 'Identifier' | 'Topic' | 'Grouping Qualifier' | 'Result Qualifier' | 'Synonym Qualifier' | 'Record Qualifier' | 'Variable Qualifier' | 'Timing' | 'Rule'
export interface VarMeta { name: string; label: string; type: 'Char' | 'Num'; role: Role; core: Core; ct?: string; note?: string; draft?: boolean }

const v = (name: string, label: string, type: 'Char' | 'Num', role: Role, core: Core, ct?: string): VarMeta => ({ name, label, type, role, core, ...(ct ? { ct } : {}) })
const ids = (d: string): VarMeta[] => [v('STUDYID', 'Study Identifier', 'Char', 'Identifier', 'Req'), v('DOMAIN', 'Domain Abbreviation', 'Char', 'Identifier', 'Req', 'DOMAIN'), v('USUBJID', 'Unique Subject Identifier', 'Char', 'Identifier', 'Req'), v(`${d}SEQ`, 'Sequence Number', 'Num', 'Identifier', 'Req')]

const META_34: Record<string, VarMeta[]> = {
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
    v('VSTPT', 'Planned Time Point Name', 'Char', 'Timing', 'Perm'), v('VSTPTNUM', 'Planned Time Point Number', 'Num', 'Timing', 'Perm'),
  ],
  EX: [
    ...ids('EX'), v('EXGRPID', 'Group ID', 'Char', 'Identifier', 'Perm'), v('EXSPID', 'Sponsor-Defined Identifier', 'Char', 'Identifier', 'Perm'),
    v('EXTRT', 'Name of Treatment', 'Char', 'Topic', 'Req'), v('EXCAT', 'Category of Treatment', 'Char', 'Grouping Qualifier', 'Perm'),
    v('EXDOSE', 'Dose', 'Num', 'Record Qualifier', 'Exp'), v('EXDOSTXT', 'Dose Description', 'Char', 'Record Qualifier', 'Perm'), v('EXDOSU', 'Dose Units', 'Char', 'Variable Qualifier', 'Exp', 'UNIT'),
    v('EXDOSFRM', 'Dose Form', 'Char', 'Variable Qualifier', 'Exp', 'FRM'), v('EXDOSFRQ', 'Dosing Frequency per Interval', 'Char', 'Variable Qualifier', 'Perm', 'FREQ'),
    v('EXROUTE', 'Route of Administration', 'Char', 'Variable Qualifier', 'Perm', 'ROUTE'), v('EXLOT', 'Lot Number', 'Char', 'Record Qualifier', 'Perm'),
    v('EPOCH', 'Epoch', 'Char', 'Timing', 'Perm', 'EPOCH'), v('EXSTDTC', 'Start Date/Time of Treatment', 'Char', 'Timing', 'Exp'), v('EXENDTC', 'End Date/Time of Treatment', 'Char', 'Timing', 'Exp'),
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
    v('CMDOSU', 'Dose Units', 'Char', 'Variable Qualifier', 'Perm', 'UNIT'), v('CMDOSFRQ', 'Dosing Frequency per Interval', 'Char', 'Variable Qualifier', 'Perm', 'FREQ'),
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
  SUPPQUAL: [
    v('STUDYID', 'Study Identifier', 'Char', 'Identifier', 'Req'), v('RDOMAIN', 'Related Domain Abbreviation', 'Char', 'Identifier', 'Req'), v('USUBJID', 'Unique Subject Identifier', 'Char', 'Identifier', 'Exp'),
    v('IDVAR', 'Identifying Variable', 'Char', 'Identifier', 'Exp'), v('IDVARVAL', 'Identifying Variable Value', 'Char', 'Identifier', 'Exp'),
    v('QNAM', 'Qualifier Variable Name', 'Char', 'Topic', 'Req'), v('QLABEL', 'Qualifier Variable Label', 'Char', 'Synonym Qualifier', 'Req'),
    v('QVAL', 'Data Value', 'Char', 'Result Qualifier', 'Req'), v('QORIG', 'Origin', 'Char', 'Record Qualifier', 'Req'), v('QEVAL', 'Evaluator', 'Char', 'Record Qualifier', 'Exp'),
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
export const isRel = (d: string) => /^(SUPP|NS)[A-Z]{2}$/.test(d)
export const relParent = (d: string) => d.replace(/^(SUPP|NS)/, '')
export const relName = (parent: string, ver: Version) => `${ver === '3.4' ? 'SUPP' : 'NS'}${parent}`
export const dsName = (d: string, ver: Version) => (isRel(d) ? relName(relParent(d), ver) : d)
export const relMetaKey = (d: string) => (d.startsWith('NS') ? 'NSQUAL' : 'SUPPQUAL')
export const relLabel = (d: string) => (d.startsWith('NS') ? `Non-standard Variables for ${relParent(d)}` : `Supplemental Qualifiers for ${relParent(d)}`)
export const DETAIL_DOMAINS = Object.keys(META_34).filter((d) => !['SE', 'TA', 'TE', 'TV', 'TI', 'TS', 'SUPPQUAL', 'NSQUAL'].includes(d))
export const TRIAL_DESIGN = ['TA', 'TE', 'TV', 'TI', 'TS']
export const hasMeta = (d: string) => !!META_34[d]

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

export function varsOf(domain: string, ver: Version): VarMeta[] {
  const base = META_34[domain] ?? []
  if (ver === '3.4') return base
  let out = base.filter((x) => !(x.name.length > 2 && x.name.endsWith('BLFL') && x.name.startsWith(domain)))
  if (GENERAL.has(domain) && !out.some((x) => x.name === 'SUBJID')) {
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
export const domainInfo = (code: string) => DOMAINS.find((d) => d.code === code)

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
  cl('COUNTRY', 'Country (ISO 3166-1 alpha-3)', false, [['USA', 'United States'], ['JPN', 'Japan'], ['DEU', 'Germany'], ['IND', 'India'], ['BRA', 'Brazil'], ['GBR', 'United Kingdom']]),
  cl('VSTESTCD', 'Vital Signs Test Code', true, [['SYSBP', 'Systolic Blood Pressure'], ['DIABP', 'Diastolic Blood Pressure'], ['PULSE', 'Pulse Rate'], ['WEIGHT', 'Weight'], ['HEIGHT', 'Height'], ['BMI', 'Body Mass Index'], ['TEMP', 'Temperature']]),
  cl('VSTEST', 'Vital Signs Test Name', true, ['Systolic Blood Pressure', 'Diastolic Blood Pressure', 'Pulse Rate', 'Weight', 'Height', 'Body Mass Index', 'Temperature']),
  cl('VSRESU', 'Units for Vital Signs Results', true, ['mmHg', 'beats/min', 'kg', 'LB', 'cm', 'in', 'kg/m2', 'C', 'F']),
  cl('UNIT', 'Unit', true, ['mg', 'g', 'mL', 'TABLET', 'kg', 'cm', '%', 'mg/dL', 'mmol/L', 'umol/L', 'U/L', 'mmol/mol']),
  cl('POSITION', 'Position', true, ['SITTING', 'STANDING', 'SUPINE']),
  cl('ND', 'Not Done', false, ['NOT DONE']),
  cl('LOC', 'Anatomical Location', true, ['ARM', 'ORAL CAVITY']),
  cl('LAT', 'Laterality', true, ['LEFT', 'RIGHT', 'BILATERAL']),
  cl('EPOCH', 'Epoch', true, ['SCREENING', 'RUN-IN', 'TREATMENT', 'FOLLOW-UP']),
  cl('FRM', 'Pharmaceutical Dosage Form', true, ['TABLET', 'CAPSULE', 'SOLUTION']),
  cl('FREQ', 'Frequency', true, ['QD', 'BID', 'TID', 'PRN', 'ONCE']),
  cl('ROUTE', 'Route of Administration', true, ['ORAL', 'INTRAVENOUS', 'SUBCUTANEOUS', 'INTRAMUSCULAR', 'TOPICAL']),
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
  cl('SPECTYPE', 'Specimen Type', true, ['BLOOD', 'SERUM', 'PLASMA', 'URINE']),
  cl('IECAT', 'Category for Inclusion/Exclusion', false, ['INCLUSION', 'EXCLUSION']),
  cl('TSPARMCD', 'Trial Summary Parameter Test Code', true, [['TITLE', 'Trial Title'], ['TPHASE', 'Trial Phase Classification'], ['STYPE', 'Study Type'], ['TTYPE', 'Trial Type'], ['INDIC', 'Trial Disease/Condition Indication'], ['TRT', 'Investigational Therapy or Treatment'], ['COMPTRT', 'Comparative Treatment Name'], ['TBLIND', 'Trial Blinding Schema'], ['TCNTRL', 'Control Type'], ['TINDTP', 'Trial Intent Type'], ['RANDOM', 'Trial is Randomized'], ['ADDON', 'Added on to Existing Treatments'], ['NARMS', 'Planned Number of Arms'], ['PLANSUB', 'Planned Number of Subjects'], ['ACTSUB', 'Actual Number of Subjects'], ['AGEMIN', 'Planned Minimum Age of Subjects'], ['AGEMAX', 'Planned Maximum Age of Subjects'], ['SEXPOP', 'Sex of Participants'], ['HLTSUBJI', 'Healthy Subject Indicator'], ['LENGTH', 'Trial Length'], ['FCNTRY', 'Planned Country of Investigational Sites'], ['SPONSOR', 'Clinical Study Sponsor'], ['SSTDTC', 'Study Start Date'], ['SENDTC', 'Study End Date'], ['SDTMVER', 'SDTM Version'], ['SDTIGVER', 'SDTM IG Version']]),
  cl('TSPARM', 'Trial Summary Parameter Test Name', true, ['Trial Title', 'Trial Phase Classification', 'Study Type', 'Trial Type', 'Trial Disease/Condition Indication', 'Investigational Therapy or Treatment', 'Comparative Treatment Name', 'Trial Blinding Schema', 'Control Type', 'Trial Intent Type', 'Trial is Randomized', 'Added on to Existing Treatments', 'Planned Number of Arms', 'Planned Number of Subjects', 'Actual Number of Subjects', 'Planned Minimum Age of Subjects', 'Planned Maximum Age of Subjects', 'Sex of Participants', 'Healthy Subject Indicator', 'Trial Length', 'Planned Country of Investigational Sites', 'Clinical Study Sponsor', 'Study Start Date', 'Study End Date', 'SDTM Version', 'SDTM IG Version']),
  cl('TPHASE', 'Trial Phase Response', true, ['PHASE I TRIAL', 'PHASE II TRIAL', 'PHASE III TRIAL', 'PHASE IV TRIAL']),
  cl('STYPE', 'Study Type Response', true, ['INTERVENTIONAL', 'OBSERVATIONAL']),
  cl('TTYPE', 'Trial Type Response', true, ['EFFICACY', 'SAFETY', 'PHARMACOKINETIC', 'PHARMACODYNAMIC']),
  cl('TBLIND', 'Trial Blinding Schema Response', true, ['DOUBLE BLIND', 'OPEN LABEL', 'SINGLE BLIND']),
  cl('TCNTRL', 'Control Type Response', true, ['PLACEBO', 'ACTIVE', 'NONE']),
  cl('TINDTP', 'Trial Intent Type Response', true, ['TREATMENT', 'PREVENTION', 'DIAGNOSIS']),
  cl('SEXPOP', 'Sex of Study Group Response', false, ['BOTH', 'F', 'M']),
  cl('DOMAIN', 'SDTM Domain Abbreviation', true, DOMAINS.filter((d) => /^[A-Z]{2}$/.test(d.code)).map((d) => d.code)),
].map((c) => [c.id, c]))
export const inCt = (id: string, value: string) => !!CT[id]?.terms.some((t) => t.value === value)
export const decode = (id: string, value: string) => CT[id]?.terms.find((t) => t.value === value)?.decode ?? ''
