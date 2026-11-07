import { useMemo, useState } from 'react'
import { useStore } from '../state'
import { useNav, type View } from '../App'
import { planPackage, sdtmFolder, PKG_RULES, type PkgFile } from '../domain/package'
import { TRANSFERS } from '../domain/seed'
import { log, isGlv } from '../domain/project'
import { STUDY } from '../domain/study'
import { Panel, Pill, Btn, Table, Stat } from './ui'
import { useData } from './shared'

const GO: Record<string, View> = { 'PKG-001': 'validation', 'PKG-002': 'validation', 'PKG-003': 'datasets', 'PKG-004': 'design', 'PKG-005': 'acrf', 'PKG-006': 'csdrg', 'PKG-007': 'validation' }
const kb = (n: number) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`)

export default function Submission() {
  const { p, act, tick } = useStore()
  const { go } = useNav()
  const data = useData()
  const plan = useMemo(() => planPackage(p, data), [data, tick])
  const [files, setFiles] = useState<PkgFile[] | null>(null)
  const [busy, setBusy] = useState(false)
  if (!isGlv(p)) return <Panel title="Submission package" sub="Built for GLV-12-301."><p className="text-sm">Open a GLV-12-301 project to build its package.</p></Panel>
  if (!plan.all.size) return <Panel title="Submission package" sub="Nothing to package yet."><p className="text-sm">Map a domain first.</p></Panel>
  const errors = plan.findings.filter((f) => f.sev === 'Error').length
  const dir = sdtmFolder(STUDY.id)
  const build = async (zip: boolean) => {
    setBusy(true)
    try {
      const { packageFiles, zipPackage } = await import('../domain/packageBuild')
      const fs = packageFiles(p, data, plan); setFiles(fs)
      if (zip) {
        const bytes = zipPackage(STUDY.id, fs)
        const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/zip' }))
        const a = document.createElement('a'); a.href = url; a.download = `${STUDY.id.toLowerCase()}_sdtm_package_transfer${p.transfer ?? 1}.zip`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
        act((pp) => log(pp, `Submission package built (${fs.length} files, ${errors} package error${errors === 1 ? '' : 's'})`))
      }
    } finally { setBusy(false) }
  }
  return (
    <div className="space-y-4">
      <Panel title="Submission package" sub={`The SDTM tabulation folder of an eCTD module 5 dataset folder: ${dir} with one .xpt per dataset, define.xml and its stylesheet, acrf.pdf and csdrg.pdf, built from ${TRANSFERS[p.transfer ?? 1].label.toLowerCase()} under the ${p.ruleSet} rule set. The package checks list what a gateway or a reviewer would stop on.`}
        right={<div className="flex gap-1"><Btn tone="grey" disabled={busy} onClick={() => build(false)}>List the files</Btn><Btn tone="solid" disabled={busy} onClick={() => build(true)}>{busy ? 'Building…' : 'Download the package (.zip)'}</Btn></div>}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Datasets" value={plan.all.size} tone="blue" />
          <Stat label="Validation issues" value={plan.issues.length} />
          <Stat label="Package errors" value={errors} tone={errors ? 'red' : 'green'} />
          <Stat label="Package warnings" value={plan.findings.length - errors} tone={plan.findings.length - errors ? 'amber' : 'green'} />
        </div>
        <p className="text-xs text-lab-text-muted" role="status">{errors ? 'The package can be downloaded to look at, but it is not ready to send: fix the errors below.' : plan.findings.length ? 'Ready to send once the warnings are reviewed.' : 'Ready to send.'}</p>
      </Panel>
      <Panel title="Package checks">
        <Table head={['Check', 'Severity', 'Where', 'Finding', 'How to fix']} rows={plan.findings.map((f) => [<span className="font-mono">{f.rule}</span>, <Pill tone={f.sev === 'Error' ? 'red' : 'amber'}>{f.sev}</Pill>, <span className="font-mono text-[11px]">{f.where}</span>, f.msg, <span className="text-[11px]">{PKG_RULES[f.rule]} <button className="underline" onClick={() => go(GO[f.rule])}>Open</button></span>])} empty="No findings." />
      </Panel>
      <Panel title="Folder" sub={dir}>
        {files ? <Table head={['File', 'Content', 'Size']} rows={files.map((f) => [<span className="font-mono">{f.name}</span>, f.what, kb(f.bytes.length)])} />
          : <Table head={['File', 'Content']} rows={[...[...plan.all.keys()].sort().map((n) => [<span className="font-mono">{n.toLowerCase()}.xpt</span>, `${n} dataset (SAS V5 transport)`]), ...[['define.xml', 'Define-XML 2.1'], ['define2-1-trainer.xsl', 'Stylesheet for define.xml'], ['acrf.pdf', 'Annotated CRF'], ['csdrg.pdf', 'Reviewer’s guide']].map(([a, b]) => [<span className="font-mono">{a}</span>, b])]} />}
        <p className="text-[11px] text-lab-text-muted">In a real submission the folder sits inside the eCTD sequence with the other modules, and the gateway checks the study data against the agency’s technical rejection criteria. The study and sponsor here are fictional.</p>
      </Panel>
    </div>
  )
}
