import { describe, expect, test } from 'vitest'
import { build } from '../src/domain/engine'
import { referenceSpec, studyData } from '../src/domain/reference'
import { createProject } from '../src/domain/project'
import { MISSIONS, evaluateMission, finishMission, startMission } from '../src/domain/missions'
import { check, RULE_SETS, severityIn } from '../src/domain/conformance'
import { referenceDesign, designBuilt, deriveSE } from '../src/domain/design'
import { ibm, toXpt, toDatasetJson } from '../src/domain/exports'
import { toR, toSAS } from '../src/domain/codegen'
import { parseCt, applyCt } from '../src/domain/ctload'
import { specRows } from '../src/domain/spec'
import { CT, CT_INFO, inCt } from '../src/domain/standards'
import { PLANTED, PLANTED_LAB, RAW_FIELDS } from '../src/domain/seed'
import { toXpt as xpt } from '../src/domain/exports'
import { toIso, toIsoTime, anyDate, toEdc } from '../src/domain/rawdate'
import { raw } from '../src/domain/seed'

const data = studyData()
const full = (v: '3.4' | '4.0d' = '3.4') => {
  const p = createProject('u', 'c', v)
  for (const d of ['DM', 'VS', 'AE', 'CM', 'EX', 'DS', 'LB', 'IE', 'MH', 'EC', 'DV', 'CO']) p.specs[d] = referenceSpec(d, v)
  p.design = referenceDesign(v)
  return p
}

describe('Phase 2 missions', () => {
  test('every mission scores 100 with the reference, in both standards and every rule set', () => {
    for (const v of ['3.4', '4.0d'] as const) for (const rs of RULE_SETS) {
      const p = full(v); p.ruleSet = rs.id
      for (const m of MISSIONS.filter((x) => x.kind !== 'fix' && x.kind !== 'qc')) {
        const r = evaluateMission(p, m.id)
        expect(r.score, `${v} ${rs.id} ${m.id}: ${r.detail.join(' | ')}`).toBe(100)
        expect(r.passed).toBe(true)
      }
    }
  })
  test('S9 loads a broken delivery that fails, and the reference fixes it', () => {
    const p = full(); startMission(p, 'S9')
    const bad = evaluateMission(p, 'S9')
    expect(bad.passed).toBe(false)
    expect(bad.domains.find((d) => d.domain === 'AE')!.findings.some((f) => f.rule === 'TRN-002' || f.variable === 'DOMAIN')).toBe(true)
    p.specs.AE = referenceSpec('AE', '3.4'); p.specs.LB = referenceSpec('LB', '3.4')
    const run = finishMission(p, 'S9')
    expect(run.score).toBe(100); expect(run.passed).toBe(true)
    expect(run.domainPass).toEqual({ AE: true, SUPPAE: true, LB: true })
  })
  test('per-domain scores: a wrong SUPPAE only fails SUPPAE', () => {
    const p = full()
    p.specs.AE = { ...referenceSpec('AE', '3.4'), supp: [] }
    const r = evaluateMission(p, 'S3')
    expect(r.domains.find((d) => d.domain === 'AE')!.passed).toBe(true)
    expect(r.domains.find((d) => d.domain === 'SUPPAE')!.passed).toBe(false)
    expect(r.passed).toBe(false)
  })
  test('an empty trial design fails S8 with credit 0', () => {
    const p = full(); p.design = {}
    const r = evaluateMission(p, 'S8')
    expect(r.score).toBeLessThan(10); expect(r.passed).toBe(false)
  })
})

describe('domains from several sources, SUPPQUAL and LB', () => {
  test('DS stacks the end-of-study form, consent and randomisation', () => {
    const ds = build(referenceSpec('DS', '3.4'), data)
    const cats = new Set(ds.rows.map((r) => r.DSCAT))
    expect(cats).toEqual(new Set(['DISPOSITION EVENT', 'PROTOCOL MILESTONE']))
    expect(ds.rows.filter((r) => r.DSDECOD === 'INFORMED CONSENT OBTAINED')).toHaveLength(90)
    expect(ds.rows.filter((r) => r.DSDECOD === 'RANDOMIZED')).toHaveLength(81)
    const seqs = ds.rows.filter((r) => r.USUBJID === ds.rows[0].USUBJID).map((r) => r.DSSEQ)
    expect(seqs).toEqual(seqs.map((_, i) => String(i + 1)))
  })
  test('SUPPAE links to AESEQ, with no record for subjects never dosed', () => {
    const ae = build(referenceSpec('AE', '3.4'), data)
    const supp = ae.supp!
    expect(supp.rows.length).toBeGreaterThan(0)
    expect(supp.rows.every((r) => r.IDVAR === 'AESEQ' && ae.rows.some((a) => a.USUBJID === r.USUBJID && a.AESEQ === r.IDVARVAL))).toBe(true)
    expect(supp.rows.some((r) => r.USUBJID.endsWith('103-007'))).toBe(false)
  })
  test('LB: duplicates dropped, units corrected, "<5" kept as text, haemolysed not done', () => {
    const lb = build(referenceSpec('LB', '3.4'), data)
    const keys = lb.rows.map((r) => `${r.USUBJID}|${r.LBTESTCD}|${r.VISITNUM}`)
    expect(new Set(keys).size).toBe(keys.length)
    expect(lb.rows.some((r) => r.LBORRESU === 'mg/dl')).toBe(false)
    const lt = lb.rows.find((r) => r.USUBJID.endsWith(PLANTED_LAB.belowLloq) && r.LBORRES === '<5')!
    expect(lt.LBSTRESC).toBe('<5'); expect(lt.LBSTRESN).toBe('')
    expect(lb.rows.filter((r) => r.USUBJID.endsWith(PLANTED_LAB.hemolysed) && r.LBSTAT === 'NOT DONE').length).toBeGreaterThan(0)
    expect(lb.rows.every((r) => !r.LBSTRESU || inCt('UNIT', r.LBSTRESU))).toBe(true)
  })
})

describe('trial design', () => {
  test('the reference design is clean under every rule set and TS has one FCNTRY per country', () => {
    const d = referenceDesign('3.4')
    expect(d.TS.filter((r) => r.TSPARMCD === 'FCNTRY')).toHaveLength(5)
    const ta = designBuilt('TA', d.TA, '3.4'), tv = designBuilt('TV', d.TV, '3.4')
    for (const rs of RULE_SETS) for (const x of ['TA', 'TE', 'TV', 'TI', 'TS']) {
      const f = check(designBuilt(x, d[x], '3.4'), '3.4', { ta, tv, set: rs.id }).filter((y) => y.sev !== 'Warning')
      expect(f, `${rs.id} ${x}`).toHaveLength(0)
    }
  })
  test('TS without SSTDTC is a Reject for FDA', () => {
    expect(severityIn('TRN-030', 'FDA')).toBe('Reject')
    const d = referenceDesign('3.4')
    const ts = designBuilt('TS', d.TS.filter((r) => r.TSPARMCD !== 'SSTDTC'), '3.4')
    expect(check(ts, '3.4', { set: 'FDA' }).some((f) => f.rule === 'TRN-030' && f.sev === 'Reject')).toBe(true)
  })
  test('SE: screen failures have one element, treated subjects start treatment at RFXSTDTC', () => {
    const se = deriveSE()
    const by = new Map<string, string[]>()
    for (const r of se.rows) by.set(r.USUBJID, [...(by.get(r.USUBJID) ?? []), r.ETCD])
    expect([...by.values()].filter((x) => x.length === 1).length).toBe(10) // 9 screen failures + 1 never dosed
    expect(se.rows.filter((r) => r.ETCD !== 'SCRN' && r.ETCD !== 'FU').every((r) => r.SESTDY === '1')).toBe(true)
  })
})

describe('exports', () => {
  test('IBM floating point', () => {
    const hex = (x: number) => [...ibm(x)].map((b) => b.toString(16).padStart(2, '0')).join('')
    expect(hex(1)).toBe('4110000000000000')
    expect(hex(-1)).toBe('c110000000000000')
    expect(hex(100)).toBe('4264000000000000')
    expect(hex(0.5)).toBe('4080000000000000')
    expect(hex(0)).toBe('0000000000000000')
  })
  test('XPT: 80-byte records, header and one NAMESTR per variable', () => {
    const dm = build(referenceSpec('DM', '3.4'), data)
    const { bytes, report } = toXpt(dm, '3.4', new Date('2026-11-06T10:00:00Z'))
    expect(bytes.length % 80).toBe(0)
    const text = new TextDecoder('latin1').decode(bytes.slice(0, 80))
    expect(text.startsWith('HEADER RECORD*******LIBRARY HEADER RECORD')).toBe(true)
    expect(new TextDecoder('latin1').decode(bytes).includes(`NAMESTR HEADER RECORD!!!!!!!000000${String(dm.vars.length).padStart(4, '0')}`)).toBe(true)
    expect(report.warnings).toEqual([])
  })
  test('XPT warns on an over-long QNAM name', () => {
    const ae = build({ ...referenceSpec('AE', '3.4'), supp: [{ qnam: 'AETREATEMERG', qlabel: 'x', expr: "'Y'", qorig: 'Derived' }] }, data)
    expect(check(ae, '3.4').some((f) => f.rule === 'TRN-049')).toBe(true)
  })
  test('Dataset-JSON v1.1: columns, keys and typed rows', () => {
    const vs = build(referenceSpec('VS', '3.4'), data)
    const j = toDatasetJson(vs, '3.4', ['STUDYID', 'USUBJID', 'VSTESTCD', 'VISITNUM'])
    expect(j.datasetJSONVersion).toBe('1.1.0')
    expect(j.records).toBe(vs.rows.length); expect(j.rows).toHaveLength(vs.rows.length)
    const i = j.columns.findIndex((c) => c.name === 'VSSTRESN')
    expect(j.columns[i].dataType).toBe('double')
    expect(j.columns.find((c) => c.name === 'USUBJID')!.keySequence).toBe(2)
    expect(j.rows.every((r) => r[i] === null || typeof r[i] === 'number')).toBe(true)
  })
})

describe('code view, specification and terminology', () => {
  test('R and SAS views cover every source and SUPP', () => {
    const ds = referenceSpec('DS', '3.4')
    const r = toR(ds), sas = toSAS(ds)
    for (const src of [ds.source, ...ds.parts!.map((x) => x.source)]) { expect(r).toContain(`raw$${src.toLowerCase()}`); expect(sas).toContain(`raw.${src.toLowerCase()}`) }
    expect(r).toContain('row_number()'); expect(sas).toContain('first.USUBJID')
    expect(toR(referenceSpec('AE', '3.4'))).toContain('pivot_longer')
    expect(toSAS(referenceSpec('VS', '3.4'))).toContain('link derive')
  })
  test('the specification marks copied fields Collected and derivations Derived', () => {
    const s = referenceSpec('VS', '3.4')
    const rows = specRows(s, build(s, data), '3.4', RAW_FIELDS.VS.map((f) => f.name))
    expect(rows.find((r) => r.variable === 'STUDYID')!.origin).toMatch(/Assigned/)
    expect(rows.find((r) => r.variable === 'VSDY')!.origin).toMatch(/Derived/)
  })
  test('an NCI EVS terminology file loads and merges with the bundled codelists', () => {
    const h = ['Code', 'Codelist Code', 'Codelist Extensible (Yes/No)', 'Codelist Name', 'CDISC Submission Value', 'CDISC Synonym(s)', 'CDISC Definition', 'NCI Preferred Term'].join('\t')
    const rows = [
      ['C66769', '', 'No', 'Severity/Intensity Scale for Adverse Events', 'AESEV', 'Severity', 'x', 'CDISC SDTM Severity Terminology'],
      ['C41338', 'C66769', '', 'Severity/Intensity Scale for Adverse Events', 'MILD', 'Mild; Grade 1', 'x', 'Mild Adverse Event'],
      ['C41339', 'C66769', '', 'Severity/Intensity Scale for Adverse Events', 'MODERATE', 'Moderate', 'x', 'Moderate Adverse Event'],
      ['C99999', '', 'Yes', 'Made-up Test Codelist', 'ZZTEST', '', 'x', ''],
      ['C99998', 'C99999', '', 'Made-up Test Codelist', 'ZZ1', 'Zed one', 'x', 'Zed'],
    ].map((r) => r.join('\t'))
    const before = Object.keys(CT).length
    const f = parseCt([h, ...rows].join('\n'), 'SDTM Terminology 2026-09-26.txt')
    expect(f.codelists.map((c) => c.id)).toEqual(['AESEV', 'ZZTEST'])
    applyCt(f)
    expect(CT.AESEV.terms.map((t) => t.value)).toEqual(['MILD', 'MODERATE'])
    expect(CT.AESEV.terms[0].decode).toBe('Mild')
    expect(CT.ZZTEST.extensible).toBe(true)
    expect(Object.keys(CT).length).toBe(before + 1)
    expect(CT_INFO.label).toContain('2026-09-26')
    applyCt(null)
    expect(CT.AESEV.terms).toHaveLength(3); expect(CT.ZZTEST).toBeUndefined(); expect(CT_INFO.loaded).toBe(false)
    expect(() => parseCt('a\tb\n1\t2')).toThrow(/NCI EVS/)
  })
})

describe('SUPPDM races and the v4.0 draft NS-- datasets', () => {
  const dm34 = () => build(referenceSpec('DM', '3.4'), data, '3.4')
  test('SUPPDM holds RACE1 and RACE2 for the subject with two races, IDVAR null', () => {
    const b = dm34()
    expect(b.rows.find((r) => r.USUBJID.endsWith(PLANTED.multiRace))!.RACE).toBe('MULTIPLE')
    const s = b.supp!
    expect(s.domain).toBe('SUPPDM')
    expect(s.rows.map((r) => [r.USUBJID.slice(-7), r.QNAM, r.QVAL, r.IDVAR, r.IDVARVAL, r.QORIG])).toEqual([[PLANTED.multiRace, 'RACE1', 'WHITE', '', '', 'Collected'], [PLANTED.multiRace, 'RACE2', 'ASIAN', '', '', 'Collected']])
    expect(check(b, '3.4').filter((f) => f.domain === 'SUPPDM')).toHaveLength(0)
  })
  test('S1 now scores SUPPDM: a DM without it fails', () => {
    const p = createProject(); p.specs.DM = { ...referenceSpec('DM', '3.4'), supp: undefined }
    const r = evaluateMission(p, 'S1')
    expect(r.domains.find((d) => d.domain === 'DM')!.passed).toBe(true)
    expect(r.domains.find((d) => d.domain === 'SUPPDM')!.passed).toBe(false)
    expect(r.passed).toBe(false)
  })
  test('v4.0 draft: NSDM is one horizontal record per subject, IDVAR and IDVARVLN null', () => {
    const b = build(referenceSpec('DM', '4.0d'), data, '4.0d')
    expect(b.supp!.domain).toBe('NSDM')
    expect(b.supp!.vars).toEqual(['STUDYID', 'RDOMAIN', 'USUBJID', 'IDVAR', 'IDVARVLN', 'RACE1', 'RACE2'])
    expect(b.supp!.rows).toHaveLength(1)
    const r = b.supp!.rows[0]
    expect([r.RDOMAIN, r.IDVAR, r.IDVARVLN, r.RACE1, r.RACE2]).toEqual(['DM', '', '', 'WHITE', 'ASIAN'])
    expect(b.supp!.labels).toEqual({ RACE1: 'Race 1', RACE2: 'Race 2' })
  })
  test('v4.0 draft: NSAE links each record to AESEQ through the numeric IDVARVLN', () => {
    const ae = build(referenceSpec('AE', '4.0d'), data, '4.0d')
    const ns = ae.supp!
    expect(ns.domain).toBe('NSAE')
    expect(ns.vars).toEqual(['STUDYID', 'RDOMAIN', 'USUBJID', 'IDVAR', 'IDVARVLN', 'AETRTEM'])
    expect(ns.rows.length).toBe(build(referenceSpec('AE', '3.4'), data, '3.4').supp!.rows.length) // one value per record either way
    expect(ns.rows.every((r) => r.IDVAR === 'AESEQ' && ae.rows.some((a) => a.USUBJID === r.USUBJID && a.AESEQ === r.IDVARVLN))).toBe(true)
    expect(check(ae, '4.0d').filter((f) => f.domain === 'NSAE')).toHaveLength(0)
    const x = xpt(ns, '4.0d')
    const txt = new TextDecoder('latin1').decode(x.bytes)
    expect(txt).toContain('Non-standard Variables for AE')
    expect(txt).toContain('Treatment Emergent Flag')
    expect(txt).toContain('Identifying Variable Numeric Value')
  })
  test('v4.0 draft: a non-standard variable reusing a standard name is flagged', () => {
    const ae = build({ ...referenceSpec('AE', '4.0d'), supp: [{ qnam: 'AESER', qlabel: 'Serious', expr: "'Y'", qorig: 'Assigned' }] }, data, '4.0d')
    expect(check(ae, '4.0d').some((f) => f.rule === 'TRN-049' && f.domain === 'NSAE' && f.variable === 'AESER')).toBe(true)
  })
  test('R and SAS code build SUPPDM from the raw race before RACE becomes MULTIPLE, and NSDM in draft mode', () => {
    const s = referenceSpec('DM', '3.4')
    const r = toR(s, '3.4'), sas = toSAS(s, '3.4')
    expect(r.indexOf('.RACE1 =')).toBeLessThan(r.indexOf('RACE = if_else'))
    expect(r).toContain('suppdm <- dm_all'); expect(r).toContain('pivot_longer')
    expect(sas).toContain("QNAM = 'RACE1'"); expect(sas).toContain('scan(RACE, 1')
    const r4 = toR(referenceSpec('DM', '4.0d'), '4.0d'), sas4 = toSAS(referenceSpec('DM', '4.0d'), '4.0d')
    expect(r4).toContain('nsdm <- dm_all'); expect(r4).toContain('IDVARVLN = NA_real_'); expect(r4).not.toContain('pivot_longer')
    expect(sas4).toContain('data nsdm'); expect(sas4).toContain('cmiss(RACE1, RACE2) < 2')
  })
})

describe('raw dates as the source systems export them', () => {
  test('conversion keeps only what was collected', () => {
    expect(toIso('10-MAR-2026', 'DD-MMM-YYYY')).toBe('2026-03-10')
    expect(toIso('UN-MAR-2026', 'DD-MMM-YYYY')).toBe('2026-03')
    expect(toIso('UN-UNK-2019', 'DD-MMM-YYYY')).toBe('2019')
    expect(toIso('15-UNK-2019', 'DD-MMM-YYYY')).toBe('2019')
    expect(toIso('20260310', 'YYYYMMDD')).toBe('2026-03-10')
    expect(() => toIso('31-FEB-2026', 'DD-MMM-YYYY')).toThrow(/calendar/)
    expect(() => toIso('2026-03-10', 'DD-MMM-YYYY')).toThrow(/not DD-MMM-YYYY/)
    expect(toIsoTime('0915')).toBe('09:15')
    expect(anyDate('UN-JAN-2024')).toBe('2024-01')
    expect(toEdc('2019')).toBe('UN-UNK-2019'); expect(toEdc('2019-03')).toBe('UN-MAR-2019')
  })
  test('the raw data uses each system’s format', () => {
    const f = raw().forms
    expect(f.EX.every((r) => /^\d{2}-[A-Z]{3}-\d{4}$/.test(r.EXSTDAT))).toBe(true)
    expect(f.CM.some((r) => /^UN-(UNK|[A-Z]{3})-\d{4}$/.test(r.CMSTDAT))).toBe(true)
    expect(f.LBC.every((r) => /^\d{8}$/.test(r.COLLDATE) && /^\d{4}$/.test(r.COLLTIME))).toBe(true)
    expect(f.IRT.every((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.RANDDT))).toBe(true)
  })
  test('the reference builds without errors; copying a raw date fails the ISO 8601 check', () => {
    for (const k of ['DM', 'VS', 'AE', 'CM', 'EX', 'DS', 'LB', 'SV']) expect(build(referenceSpec(k, '3.4'), data).errors, k).toEqual({})
    const s = referenceSpec('AE', '3.4'); s.rules.AESTDTC = { kind: 'copy', field: 'AESTDAT' }
    expect(check(build(s, data), '3.4').some((f) => f.rule === 'TRN-005' && f.variable === 'AESTDTC')).toBe(true)
    const v = referenceSpec('VS', '3.4'); v.rules.VSDTC = { kind: 'expr', expr: 'iso(VSDAT, VSTIM)' }
    expect(build(v, data).errors.VSDTC.first).toMatch(/dtc\(field, 'DD-MMM-YYYY'\)/)
  })
})

describe('independent QC (mission S10)', () => {
  test('the colleague’s VS passes the checks but the compare finds three differences', async () => {
    const { compareDatasets, qcItems, sharedRules } = await import('../src/domain/qc')
    const { SORT } = await import('../src/domain/reference')
    const p = createProject(); startMission(p, 'S10')
    const prod = build(p.specs.VS, data)
    expect(check(prod, '3.4').filter((f) => f.sev !== 'Warning')).toHaveLength(0)
    p.qc = { VS: referenceSpec('VS', '3.4') }
    const c = compareDatasets(prod, build(p.qc.VS, data), SORT.VS)
    expect(c.clean).toBe(false)
    expect(new Set(qcItems(c).map((i) => i.id))).toEqual(new Set(['values:VSSTRESC', 'values:VSSTRESN', 'values:VSLOBXFL', 'values:VSSEQ', 'obs-only-prod', 'obs-only-qc']))
    expect(sharedRules(p.specs.VS, p.qc.VS).same).toBeGreaterThan(0)
    expect(evaluateMission(p, 'S10').passed).toBe(false)
    // Correct production, sign off: the mission passes.
    p.specs.VS = referenceSpec('VS', '3.4')
    expect(compareDatasets(build(p.specs.VS, data), build(p.qc.VS, data), SORT.VS).clean).toBe(true)
    expect(evaluateMission(p, 'S10').detail.some((x) => /not signed off/.test(x))).toBe(true)
    p.qcSignoff = { VS: { utc: new Date(Date.now() + 1000).toISOString(), by: 'u', note: '' } }
    const r = finishMission(p, 'S10')
    expect(r.passed).toBe(true); expect(r.score).toBe(100)
    expect(Object.keys(r.domainScores!)).toEqual(['VS', 'VS (QC)'])
  })
  test('numbers compare by value', async () => {
    const { same } = await import('../src/domain/qc')
    expect(same('1', '1.0')).toBe(true); expect(same('1', '1.1')).toBe(false); expect(same('', '0')).toBe(false)
  })
})

describe('data transfer 2 (mission S11)', () => {
  test('the raw changes are the planted ones', async () => {
    const { rawChanges, byField } = await import('../src/domain/delivery')
    const { TRANSFER2 } = await import('../src/domain/seed')
    const ch = rawChanges(raw(1).forms, raw(2).forms)
    const f = (n: string) => ch.find((x) => x.form === n)!
    expect(f('AE').added.map((r) => r.AETERM)).toEqual(['Muscle cramps', 'Swelling of the legs'])
    expect(f('CM').removed).toHaveLength(1)
    expect(f('DM').changed.map((c) => [c.subj, c.field])).toEqual([[TRANSFER2.birthCorrected, 'BRTHDAT']])
    expect(byField(f('LBC').changed).map((x) => x.field).sort()).toEqual(['REFHIGH', 'REFLOW', 'RESULT', 'UNITS'])
    expect(f('AE').changed.some((c) => c.field === 'AEHLT' && c.to === 'Dizziness and giddiness')).toBe(true)
    expect(f('VS').changed).toHaveLength(1)
  })
  test('the reference handles transfer 2; a fixed lab factor converts SI results twice', () => {
    const d2 = studyData(2)
    for (const k of ['DM', 'VS', 'AE', 'CM', 'EX', 'DS', 'LB', 'SV']) expect(build(referenceSpec(k, '3.4'), d2).errors, k).toEqual({})
    const p = createProject()
    for (const d of ['DM', 'AE', 'LB']) p.specs[d] = referenceSpec(d, '3.4')
    p.specs.AE.supp = undefined
    startMission(p, 'S11'); expect(p.transfer).toBe(2)
    expect(evaluateMission(p, 'S11').score).toBe(100)
    p.specs.LB.rules.LBSTRESC = { kind: 'expr', expr: "if(isblank(RESULT), '', if(substr(RESULT, 1, 1) = '<', RESULT, str(round(num(RESULT) * lab(TESTCODE, 'factor'), lab(TESTCODE, 'decimals')))))" }
    const r = evaluateMission(p, 'S11')
    expect(r.domains.find((x) => x.domain === 'LB')!.comparison.perVar.find((x) => x.v === 'LBSTRESC')!.credit).toBeLessThan(1)
    // On transfer 1 the same rule was right.
    p.transfer = 1
    expect(evaluateMission(p, 'S11').domains.find((x) => x.domain === 'LB')!.comparison.perVar.find((x) => x.v === 'LBSTRESC')!.credit).toBe(1)
  })
  test('delivery comparison: AE gains two records and DM one changed age', async () => {
    const { compareDatasets } = await import('../src/domain/qc')
    const { SORT } = await import('../src/domain/reference')
    const ae = compareDatasets(build(referenceSpec('AE', '3.4'), studyData(1)), build(referenceSpec('AE', '3.4'), studyData(2)), SORT.AE)
    expect(ae.obsOnlyCompare).toHaveLength(2)
    const dm = compareDatasets(build(referenceSpec('DM', '3.4'), studyData(1)), build(referenceSpec('DM', '3.4'), studyData(2)), SORT.DM)
    expect(dm.diffs.map((d) => d.v).sort()).toEqual(['AGE', 'BRTHDTC'])
  })
})

describe('IE, MH, EC, DV and CO (missions S12 and S13)', () => {
  test('IE holds only criteria not met, with the protocol text', () => {
    const ie = build(referenceSpec('IE', '3.4'), data)
    const sf = raw().subjects.filter((x) => x.fate === 'screen-fail').map((x) => `GLV-12-301-${x.subj}`)
    expect([...new Set(ie.rows.map((r) => r.USUBJID))].sort()).toEqual(sf.sort())
    expect(ie.rows.every((r) => (r.IECAT === 'INCLUSION' && r.IEORRES === 'N') || (r.IECAT === 'EXCLUSION' && r.IEORRES === 'Y'))).toBe(true)
    expect(ie.rows.some((r) => r.IETEST.length > 40)).toBe(true)
    expect(check(ie, '3.4')).toHaveLength(0)
    const s = referenceSpec('AE', '3.4'); s.rules.AETERM = { kind: 'expr', expr: "concat(AETERM, ' reported by the subject at the visit')" }
  })
  test('EC is blinded and in tablets; EX is unblinded in mg', () => {
    const ec = build(referenceSpec('EC', '3.4'), data), ex = build(referenceSpec('EX', '3.4'), data)
    expect(ec.rows.length).toBe(ex.rows.length)
    expect(new Set(ec.rows.map((r) => r.ECTRT))).toEqual(new Set(['GLV-12 OR PLACEBO']))
    expect(new Set(ec.rows.map((r) => r.ECDOSU))).toEqual(new Set(['TABLET']))
    expect(new Set(ex.rows.map((r) => r.EXTRT))).toEqual(new Set(['GLV-12', 'PLACEBO']))
  })
  test('DV from the CTMS log with DD/MM/YYYY dates; CO split between words', async () => {
    const { LONG_COMMENT } = await import('../src/domain/seed')
    expect(raw().forms.DVL.every((r) => /^\d{2}\/\d{2}\/\d{4}$/.test(r.DEVDATE))).toBe(true)
    const dv = build(referenceSpec('DV', '3.4'), data)
    expect(dv.rows.every((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.DVSTDTC))).toBe(true)
    expect(dv.rows.filter((r) => r.DVSCAT === 'IMPORTANT').length).toBeGreaterThanOrEqual(2)
    const co = build(referenceSpec('CO', '3.4'), data)
    const long = co.rows.find((r) => r.COVAL1)!
    expect(long.COVAL.length).toBeLessThanOrEqual(200)
    expect(`${long.COVAL} ${long.COVAL1}`).toBe(LONG_COMMENT)
    expect(co.rows.some((r) => r.RDOMAIN === '')).toBe(true)
    // Unsplit, the long comment breaks the 200-character limit.
    const s = referenceSpec('CO', '3.4'); s.rules.COVAL = { kind: 'copy', field: 'COMMENT' }
    expect(check(build(s, data), '3.4').some((f) => f.rule === 'TRN-052')).toBe(true)
  })
})
