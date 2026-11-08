// define.xml v2.1, generated from the project: the datasets as built, their variables and
// metadata, origins (collected variables point to their acrf.pdf page), methods for derived
// variables, value-level metadata for findings results and supplemental qualifiers, the
// codelists used, comments, and links to the datasets, acrf.pdf and csdrg.pdf. One model feeds
// both the XML and the in-app preview, so the two always agree.

import type { Built, DomainSpec, Rule } from './engine'
import { varsOf, metaOf, domainInfo, isRel, relParent, relMetaKey, relLabel, CT, CT_INFO, customDomains, type Version, type VarMeta } from './standards'
import { originOf, describe } from './spec'
import { RAW_FIELDS, FORM_INFO } from './seed'
import { STUDY } from './study'
import { acrfPageOf, type LaidPage } from './acrf'
import { DESIGN_SORT } from './design'
import { SORT } from './reference'

export interface DOrigin { type: 'Collected' | 'Derived' | 'Assigned' | 'Protocol' | 'Not Available'; source?: string; pages?: number[]; text?: string }
export interface DItem { oid: string; name: string; label: string; dataType: string; length?: number; codelist?: string; origin: DOrigin; valueList?: string; method?: string; comment?: string }
export interface DItemRef { item: string; order: number; mandatory: boolean; key?: number; role?: string; method?: string }
export interface DDataset { oid: string; name: string; label: string; cls: string; structure: string; refs: DItemRef[]; keys: string[]; leaf: string; comment?: string; records: number }
export interface DWhere { oid: string; item: string; values: string[] }
export interface DValueList { oid: string; refs: (DItemRef & { where: string })[] }
export interface DCodelist { oid: string; name: string; extensible: boolean; terms: { value: string; decode?: string }[] }
export interface DMethod { oid: string; name: string; description: string }
export interface DComment { oid: string; text: string }
export interface DefineModel {
  study: string; title: string; version: Version; created: string
  standards: { oid: string; name: string; type: string; version: string; status: string; publishingSet?: string }[]
  datasets: DDataset[]; items: DItem[]; valueLists: DValueList[]; wheres: DWhere[]; codelists: DCodelist[]; methods: DMethod[]; comments: DComment[]
  leaves: { id: string; href: string; title: string }[]
}

const FORM_SRC: Record<string, string> = Object.fromEntries(Object.entries(FORM_INFO).map(([k, v]) => [k, v.source === 'EDC' ? 'Investigator' : 'Vendor']))
const CLASS: Record<string, string> = { 'Special-Purpose': 'SPECIAL PURPOSE', Interventions: 'INTERVENTIONS', Events: 'EVENTS', Findings: 'FINDINGS', 'Findings About': 'FINDINGS ABOUT', 'Trial Design': 'TRIAL DESIGN', Relationship: 'RELATIONSHIP', 'Study Reference': 'STUDY REFERENCE' }
const RELREC_META: VarMeta[] = varsOf('RELREC', '3.4')
function metaFor(ds: string, v: string, ver: Version): VarMeta | undefined {
  if (ds === 'RELREC') return RELREC_META.find((m) => m.name === v)
  if (isRel(ds)) return metaOf(relMetaKey(ds), v, ver)
  return metaOf(ds, v, ver)
}
function dataType(m: VarMeta | undefined, v: string, values: string[]): string {
  if (/DTC$/.test(v)) return 'datetime'
  if (/(DUR|ELTM)$/.test(v)) return 'durationDatetime'
  const num = values.every((x) => /^-?\d+(\.\d+)?$/.test(x)) && values.length > 0
  if (m?.type === 'Num' || (!m && num)) return values.every((x) => /^-?\d+$/.test(x)) ? 'integer' : 'float'
  return 'text'
}
const lengthOf = (t: string, values: string[]) => (t === 'text' ? Math.max(1, ...values.map((x) => x.length)) : t === 'integer' || t === 'float' ? 8 : undefined)

// study, rawFields and formSource default to GLV-12-301's.
export interface DefineInput { builts: Map<string, Built>; specs: Record<string, DomainSpec>; version: Version; laid: LaidPage[]; designDomains: string[]; study?: { id: string; title: string }; rawFields?: Record<string, { name: string }[]>; formSource?: Record<string, string> }
export function buildDefine(inp: DefineInput, now = new Date()): DefineModel {
  const { builts, specs, version: ver, laid } = inp
  const m: DefineModel = {
    study: inp.study?.id ?? STUDY.id, title: inp.study?.title ?? STUDY.title, version: ver, created: now.toISOString().slice(0, 19),
    standards: [
      { oid: 'STD.1', name: ver === 'send' ? 'SENDIG' : 'SDTMIG', type: 'IG', version: ver === '3.4' ? '3.4' : ver === 'send' ? '3.1.1' : '4.0', status: ver === '4.0d' ? 'Draft' : 'Final' },
      { oid: 'STD.2', name: 'CDISC/NCI', type: 'CT', publishingSet: ver === 'send' ? 'SEND' : 'SDTM', version: /(\d{4}-\d{2}(-\d{2})?)/.exec(CT_INFO.label)?.[1] ?? 'bundled', status: 'Final' },
    ],
    datasets: [], items: [], valueLists: [], wheres: [], codelists: [], methods: [], comments: [],
    leaves: [{ id: 'LF.acrf', href: 'acrf.pdf', title: 'Annotated CRF' }, { id: 'LF.csdrg', href: 'csdrg.pdf', title: 'Clinical Study Data Reviewer’s Guide' }],
  }
  const usedCl = new Map<string, Set<string>>()
  const raw = (f: string) => ((inp.rawFields ?? RAW_FIELDS)[f] ?? []).map((x) => x.name)
  for (const [name, b] of builts) {
    const spec = specs[name]
    const info = domainInfo(isRel(name) ? 'SUPPQUAL' : name)
    const custom = customDomains().find((c) => c.code === name)
    const cls = isRel(name) || name === 'RELREC' ? 'RELATIONSHIP' : CLASS[info?.cls ?? 'Findings'] ?? 'FINDINGS'
    const keys = (DESIGN_SORT[name] ?? SORT[name] ?? (isRel(name) ? ['STUDYID', 'RDOMAIN', 'USUBJID', 'IDVAR', name.startsWith('NS') ? 'IDVARVLN' : 'IDVARVAL', ...(name.startsWith('NS') ? [] : ['QNAM'])] : name === 'RELREC' ? ['STUDYID', 'RDOMAIN', 'USUBJID', 'IDVAR', 'IDVARVAL', 'RELID'] : ['USUBJID'])).filter((k) => b.vars.includes(k))
    const ds: DDataset = { oid: `IG.${name}`, name, label: (isRel(name) ? relLabel(name) : name === 'RELREC' ? 'Related Records' : info?.name ?? custom?.name ?? name).slice(0, 40), cls, structure: isRel(name) ? (name.startsWith('NS') ? `One record per ${relParent(name)} record with non-standard values` : 'One record per IDVAR, IDVARVAL, and QNAM value per subject') : name === 'RELREC' ? 'One record per related record, group of records or dataset' : info?.structure ?? custom?.structure ?? '', refs: [], keys, leaf: `LF.${name}`, records: b.rows.length }
    m.leaves.push({ id: ds.leaf, href: `${name.toLowerCase()}.xpt`, title: `${name.toLowerCase()}.xpt` })
    if (custom) { const c = { oid: `COM.${name}`, text: `Sponsor-defined domain. ${custom.reason}` }; m.comments.push(c); ds.comment = c.oid }
    if (spec?.filter) { const c = { oid: `COM.${name}.FILTER`, text: `Records are selected from ${spec.source} where ${spec.filter}.` }; m.comments.push(c); ds.comment ??= c.oid }
    b.vars.forEach((v, i) => {
      const meta = metaFor(name, v, ver) ?? (b.labels?.[v] ? { name: v, label: b.labels[v], type: 'Char', role: 'Record Qualifier', core: 'Perm' } as VarMeta : undefined)
      const values = b.rows.map((r) => r[v] ?? '').filter((x) => x !== '')
      const dt = dataType(meta, v, values)
      const item: DItem = { oid: `IT.${name}.${v}`, name: v, label: (meta?.label ?? v).slice(0, 40), dataType: dt, length: lengthOf(dt, values), origin: { type: 'Derived', source: 'Sponsor' } }
      // Origin, from the rule that fills the variable.
      if (inp.designDomains.includes(name)) item.origin = { type: 'Protocol' }
      else if (name === 'SE') item.origin = { type: 'Derived', source: 'Sponsor', text: 'Derived from DM and the trial design' }
      else if (name === 'RELREC') item.origin = { type: 'Derived', source: 'Sponsor', text: 'From the relationship rules' }
      else if (isRel(name)) item.origin = { type: v === 'QVAL' || !['STUDYID', 'RDOMAIN', 'USUBJID', 'IDVAR', 'IDVARVAL', 'IDVARVLN', 'QNAM', 'QLABEL', 'QORIG', 'QEVAL'].includes(v) ? 'Collected' : 'Assigned', source: 'Sponsor' }
      else if (spec) {
        const rules: { source: string; rule: Rule | undefined }[] = [{ source: spec.source, rule: spec.rules[v] }, ...(spec.parts ?? []).map((p) => ({ source: p.source, rule: p.rules[v] }))].filter((x) => x.rule)
        const o = rules.map((x) => originOf(x.rule, x.source, raw(x.source)))
        const collected = o.find((x) => x.origin === 'Collected'), assigned = o.every((x) => x.origin === 'Assigned')
        // A variable annotated on the aCRF is collected there, even when a small expression cleans it.
        const pages = acrfPageOf(laid, specs, name, v)
        if (collected || (pages.length && !assigned)) item.origin = { type: 'Collected', source: collected?.source ?? ((inp.formSource ?? FORM_SRC)[spec.source] ?? 'Investigator'), pages }
        else if (assigned && o.length) item.origin = { type: 'Assigned', source: 'Sponsor', text: rules.map((x) => describe(x.rule)).join(' | ') }
        else if (o.length) {
          const mt = { oid: `MT.${name}.${v}`, name: `Algorithm for ${name}.${v}`, description: rules.map((x, k) => `${rules.length > 1 ? `[${x.source}] ` : ''}${describe(x.rule)}${k < rules.length - 1 ? '' : ''}`).join(' | ') }
          m.methods.push(mt); item.method = mt.oid
        }
      }
      if (meta?.ct && CT[meta.ct]) { item.codelist = `CL.${meta.ct}`; const u = usedCl.get(meta.ct) ?? usedCl.set(meta.ct, new Set()).get(meta.ct)!; values.forEach((x) => u.add(x)) }
      m.items.push(item)
      ds.refs.push({ item: item.oid, order: i + 1, mandatory: meta?.core === 'Req', key: keys.indexOf(v) >= 0 ? keys.indexOf(v) + 1 : undefined, role: meta?.role, method: item.method })
    })
    // Value-level metadata: original results per test, and supplemental qualifiers per QNAM.
    const tcd = `${name}TESTCD`
    const vlm = (target: string, by: string, keysV: string[], originFor: (k: string) => DOrigin) => {
      if (!b.vars.includes(target) || !keysV.length) return
      const vl: DValueList = { oid: `VL.${name}.${target}`, refs: [] }
      keysV.forEach((k, j) => {
        const w: DWhere = { oid: `WC.${name}.${by}.${k}`, item: `IT.${name}.${by}`, values: [k] }
        const values = b.rows.filter((r) => r[by] === k).map((r) => r[target] ?? '').filter(Boolean)
        const dt = dataType(undefined, target, values)
        const it: DItem = { oid: `IT.${name}.${target}.${k}`, name: target, label: `${target} for ${k}`.slice(0, 40), dataType: dt, length: lengthOf(dt, values), origin: originFor(k) }
        m.wheres.push(w); m.items.push(it); vl.refs.push({ item: it.oid, order: j + 1, mandatory: false, where: w.oid })
      })
      m.valueLists.push(vl)
      m.items.find((x) => x.oid === `IT.${name}.${target}`)!.valueList = vl.oid
    }
    if (b.vars.includes(tcd) && spec) {
      const tests = [...new Set(b.rows.map((r) => r[tcd]).filter(Boolean))].sort()
      const src = spec.source === 'LBC' ? 'Vendor' : 'Investigator'
      vlm(`${name}ORRES`, tcd, tests, () => ({ type: 'Collected', source: src, pages: acrfPageOf(laid, specs, name, `${name}ORRES`) }))
    }
    if (isRel(name) && name.startsWith('SUPP')) {
      const parent = specs[relParent(name)]
      const q = [...new Set(b.rows.map((r) => r.QNAM))].sort()
      vlm('QVAL', 'QNAM', q, (k) => { const def = parent?.supp?.find((x) => x.qnam === k); return { type: (def?.qorig ?? 'Derived') as DOrigin['type'], source: def?.qorig === 'Collected' ? 'Investigator' : 'Sponsor', pages: def?.qorig === 'Collected' ? acrfPageOf(laid, specs, name, k) : undefined, text: def?.qorig === 'Derived' ? def.expr : undefined } })
    }
    m.datasets.push(ds)
  }
  for (const [id, used] of [...usedCl].sort()) {
    const cl = CT[id]
    m.codelists.push({ oid: `CL.${id}`, name: cl.name, extensible: cl.extensible, terms: cl.terms.filter((t) => used.has(t.value)).concat([...used].filter((u) => !cl.terms.some((t) => t.value === u)).map((u) => ({ value: u }))) })
  }
  return m
}

// ---------- XML ----------
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const desc = (t: string) => `<Description><TranslatedText xml:lang="en">${esc(t)}</TranslatedText></Description>`
export const STYLESHEET = 'define2-1-trainer.xsl'
export function toDefineXml(m: DefineModel): string {
  const L: string[] = []
  L.push('<?xml version="1.0" encoding="UTF-8"?>', `<?xml-stylesheet type="text/xsl" href="${STYLESHEET}"?>`)
  L.push(`<ODM xmlns="http://www.cdisc.org/ns/odm/v1.3" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:def="http://www.cdisc.org/ns/def/v2.1" ODMVersion="1.3.2" FileType="Snapshot" FileOID="DEF.${esc(m.study)}" CreationDateTime="${m.created}" Originator="SDTM Mapping Trainer (training data, fictional study)" SourceSystem="SDTM Mapping Trainer" SourceSystemVersion="3" def:Context="Submission">`)
  L.push(` <Study OID="STDY.${esc(m.study)}">`, `  <GlobalVariables><StudyName>${esc(m.study)}</StudyName><StudyDescription>${esc(m.title)}</StudyDescription><ProtocolName>${esc(m.study)}</ProtocolName></GlobalVariables>`)
  L.push(`  <MetaDataVersion OID="MDV.${esc(m.study)}.SDTM" Name="${esc(m.study)} SDTM" Description="SDTM tabulation datasets (training)" def:DefineVersion="2.1.0">`)
  L.push('   <def:Standards>', ...m.standards.map((s) => `    <def:Standard OID="${s.oid}" Name="${s.name}" Type="${s.type}"${s.publishingSet ? ` PublishingSet="${s.publishingSet}"` : ''} Version="${esc(s.version)}" Status="${s.status}"/>`), '   </def:Standards>')
  L.push('   <def:AnnotatedCRF><def:DocumentRef leafID="LF.acrf"/></def:AnnotatedCRF>', '   <def:SupplementalDoc><def:DocumentRef leafID="LF.csdrg"/></def:SupplementalDoc>')
  for (const vl of m.valueLists) L.push(`   <def:ValueListDef OID="${vl.oid}">`, ...vl.refs.map((r) => `    <ItemRef ItemOID="${r.item}" OrderNumber="${r.order}" Mandatory="${r.mandatory ? 'Yes' : 'No'}"><def:WhereClauseRef WhereClauseOID="${r.where}"/></ItemRef>`), '   </def:ValueListDef>')
  for (const w of m.wheres) L.push(`   <def:WhereClauseDef OID="${w.oid}"><RangeCheck SoftHard="Soft" def:ItemOID="${w.item}" Comparator="${w.values.length > 1 ? 'IN' : 'EQ'}">${w.values.map((v) => `<CheckValue>${esc(v)}</CheckValue>`).join('')}</RangeCheck></def:WhereClauseDef>`)
  for (const d of m.datasets) {
    L.push(`   <ItemGroupDef OID="${d.oid}" Name="${d.name}" SASDatasetName="${d.name}" Repeating="${d.name === 'DM' ? 'No' : 'Yes'}" IsReferenceData="${d.cls === 'TRIAL DESIGN' ? 'Yes' : 'No'}" Purpose="Tabulation" def:Structure="${esc(d.structure)}" def:StandardOID="STD.1" def:ArchiveLocationID="${d.leaf}"${d.comment ? ` def:CommentOID="${d.comment}"` : ''}>`, `    ${desc(d.label)}`)
    for (const r of d.refs) L.push(`    <ItemRef ItemOID="${r.item}" OrderNumber="${r.order}" Mandatory="${r.mandatory ? 'Yes' : 'No'}"${r.key ? ` KeySequence="${r.key}"` : ''}${r.method ? ` MethodOID="${r.method}"` : ''}${r.role ? ` Role="${r.role}"` : ''}/>`)
    L.push(`    <def:Class Name="${d.cls}"/>`, `    <def:leaf ID="${d.leaf}" xlink:href="${d.name.toLowerCase()}.xpt"><def:title>${d.name.toLowerCase()}.xpt</def:title></def:leaf>`, '   </ItemGroupDef>')
  }
  for (const it of m.items) {
    L.push(`   <ItemDef OID="${it.oid}" Name="${it.name}" SASFieldName="${it.name}" DataType="${it.dataType}"${it.length ? ` Length="${it.length}"` : ''}${it.comment ? ` def:CommentOID="${it.comment}"` : ''}>`, `    ${desc(it.label)}`)
    if (it.codelist) L.push(`    <CodeListRef CodeListOID="${it.codelist}"/>`)
    const o = it.origin
    L.push(`    <def:Origin Type="${o.type}"${o.source ? ` Source="${o.source}"` : ''}>${o.text ? desc(o.text) : ''}${o.pages?.length ? `<def:DocumentRef leafID="LF.acrf"><def:PDFPageRef PageRefs="${o.pages.join(' ')}" Type="PhysicalRef"/></def:DocumentRef>` : ''}</def:Origin>`)
    if (it.valueList) L.push(`    <def:ValueListRef ValueListOID="${it.valueList}"/>`)
    L.push('   </ItemDef>')
  }
  for (const c of m.codelists) {
    const decoded = c.terms.some((t) => t.decode)
    const std = CT[c.oid.slice(3)]
    // Terms a sponsor added to an extensible codelist are marked as extended values.
    const ext = (v: string) => (std && !std.terms.some((s) => s.value === v) ? ' def:ExtendedValue="Yes"' : '')
    L.push(`   <CodeList OID="${c.oid}" Name="${esc(c.name)}" DataType="text" def:StandardOID="STD.2">`)
    c.terms.forEach((t, i) => L.push(decoded ? `    <CodeListItem CodedValue="${esc(t.value)}" OrderNumber="${i + 1}"${ext(t.value)}><Decode><TranslatedText xml:lang="en">${esc(t.decode ?? t.value)}</TranslatedText></Decode></CodeListItem>` : `    <EnumeratedItem CodedValue="${esc(t.value)}" OrderNumber="${i + 1}"${ext(t.value)}/>`))
    L.push('   </CodeList>')
  }
  for (const mt of m.methods) L.push(`   <MethodDef OID="${mt.oid}" Name="${esc(mt.name)}" Type="Computation">${desc(mt.description)}</MethodDef>`)
  for (const c of m.comments) L.push(`   <def:CommentDef OID="${c.oid}">${desc(c.text)}</def:CommentDef>`)
  for (const l of m.leaves.filter((x) => ['LF.acrf', 'LF.csdrg'].includes(x.id))) L.push(`   <def:leaf ID="${l.id}" xlink:href="${l.href}"><def:title>${esc(l.title)}</def:title></def:leaf>`)
  L.push('  </MetaDataVersion>', ' </Study>', '</ODM>')
  return L.join('\n')
}

// ---------- checks ----------
export interface DefineFinding { rule: string; sev: 'Error' | 'Warning'; where: string; msg: string }
export function checkDefine(m: DefineModel, builts: Map<string, Built>): DefineFinding[] {
  const out: DefineFinding[] = []
  const items = new Map(m.items.map((i) => [i.oid, i]))
  for (const d of m.datasets) {
    if (d.label.length > 40) out.push({ rule: 'DEF-005', sev: 'Error', where: d.name, msg: 'Dataset label over 40 characters' })
    const b = builts.get(d.name)!
    if (d.keys.length && b) { const seen = new Set<string>(); let dup = 0; for (const r of b.rows) { const k = d.keys.map((x) => r[x]).join('|'); if (seen.has(k)) dup++; seen.add(k) } if (dup) out.push({ rule: 'DEF-006', sev: 'Error', where: d.name, msg: `Key variables (${d.keys.join(', ')}) do not identify records uniquely: ${dup} duplicate${dup === 1 ? '' : 's'}` }) }
    for (const r of d.refs) {
      const it = items.get(r.item)!
      if (it.origin.type === 'Collected' && it.origin.source === 'Investigator' && !it.origin.pages?.length) out.push({ rule: 'DEF-001', sev: 'Error', where: `${d.name}.${it.name}`, msg: 'Collected on the CRF, but no aCRF page annotates it' })
      if (it.codelist) {
        const cl = m.codelists.find((c) => c.oid === it.codelist)!, std = CT[it.codelist.slice(3)]
        const bad = cl.terms.filter((t) => !std?.terms.some((s) => s.value === t.value)).map((t) => t.value)
        if (bad.length && !std?.extensible) out.push({ rule: 'DEF-003', sev: 'Error', where: `${d.name}.${it.name}`, msg: `Values not in codelist ${cl.name}: ${bad.slice(0, 4).join(', ')}` })
      }
      if (it.origin.type === 'Derived' && !it.method && !it.origin.text && !it.valueList) out.push({ rule: 'DEF-004', sev: 'Warning', where: `${d.name}.${it.name}`, msg: 'Derived with no method' })
    }
  }
  return out
}
export const DEFINE_RULES: Record<string, string> = {
  'DEF-001': 'A variable collected on the CRF has no aCRF page: annotate it on the aCRF tab.',
  'DEF-003': 'The data hold values outside the variable’s non-extensible codelist: recode them in the mapping.',
  'DEF-004': 'A derived variable needs a method describing the derivation.',
  'DEF-005': 'Labels are at most 40 characters.',
  'DEF-006': 'The key variables must identify each record; add a key (a time point, a sequence) or remove duplicates.',
}
