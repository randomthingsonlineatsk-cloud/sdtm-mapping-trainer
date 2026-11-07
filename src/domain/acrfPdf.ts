// acrf.pdf, written in the browser: a linked table of contents, one section per unique CRF
// page with the domain header at the top left and each field's annotation in a box coloured by
// its domain, and bookmarks by form and by visit (as reviewers navigate an aCRF).

import { jsPDF } from 'jspdf'
import { domainsOf, namedVars, layoutAcrf, DOMAIN_COLOURS, NOT_SUBMITTED, VISIT_ORDER, type CrfPage } from './acrf'
import type { DomainSpec } from './engine'
import { domainInfo } from './standards'

const W = 595, H = 842, M = 40 // A4 in points
const hex = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]

export function acrfPdf(study: string, pages: CrfPage[], notes: Record<string, Record<string, string>>, specs: Record<string, DomainSpec>): Uint8Array {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const footer = (n: number) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(120); doc.text(`${study} · annotated CRF · fictional study for training · page ${n}`, M, H - 20); doc.setTextColor(0) }
  // Table of contents first; its links are added once the page numbers are known.
  const first: Record<string, number> = {}
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(`Annotated Case Report Form`, M, 60)
  doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.text(`${study} · SDTM annotations · unique pages only`, M, 78)
  const laid = layoutAcrf(pages, notes)
  for (const pg of pages) {
    const lp = laid.find((x) => x.form === pg.form)!
    doc.addPage(); let pn = doc.getNumberOfPages(); first[pg.form] = pn
    const doms = domainsOf(pg.form, specs)
    // Domain header: top left, one box per domain, in the page's colours.
    let x = M
    doc.setFontSize(8); doc.setFont('helvetica', 'bold')
    for (const [i, d] of doms.entries()) {
      const label = `${d} (${domainInfo(d)?.name ?? d})`, w = doc.getTextWidth(label) + 10
      doc.setFillColor(...hex(DOMAIN_COLOURS[i % DOMAIN_COLOURS.length])); doc.setDrawColor(60); doc.rect(x, 30, w, 14, 'FD'); doc.text(label, x + 5, 40)
      x += w + 6
    }
    doc.setFontSize(13); doc.text(pg.title, M, 80)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90); doc.text(`Form ${pg.form} · visits: ${pg.visits.join(', ')}`, M, 94); doc.setTextColor(0)
    for (const f of lp.fields) {
      if (f.page > pn) { footer(pn); doc.addPage(); pn = doc.getNumberOfPages() }
      const a = f.text, y = f.y
      const nv = namedVars(a, doms)
      const di = Math.max(0, doms.indexOf(nv[0]?.domain ?? ''))
      const colour = a === NOT_SUBMITTED || !a ? '#E5E7EB' : DOMAIN_COLOURS[di % DOMAIN_COLOURS.length]
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold'); doc.text(f.label, M, y + 8)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(120); doc.text(f.name, M, y + 18); doc.setTextColor(0)
      doc.setDrawColor(150); doc.rect(M + 150, y, 160, 14)
      if (f.date) { doc.setTextColor(150); doc.text('DD-MMM-YYYY', M + 154, y + 10); doc.setTextColor(0) }
      if (f.opts.length) doc.text(f.opts, M + 150, y + 24)
      doc.setFillColor(...hex(colour)); doc.setDrawColor(80); doc.rect(W - M - 205, y - 2, 205, 6 + f.ann.length * 10, 'FD')
      doc.setFont('helvetica', a === NOT_SUBMITTED ? 'italic' : 'normal'); doc.text(f.ann, W - M - 201, y + 7)
    }
    footer(pn)
    if (pn !== lp.last) throw new Error(`acrf layout mismatch on ${pg.form}`)
  }
  // Contents with links, on page 1.
  doc.setPage(1)
  let y = 110
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Forms', M, y); y += 16
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  for (const pg of pages) { doc.setTextColor(30, 64, 175); doc.textWithLink(`${pg.title} (${pg.form})`, M + 10, y, { pageNumber: first[pg.form] }); doc.setTextColor(0); doc.text(String(first[pg.form]), W - M, y, { align: 'right' }); y += 13 }
  y += 10
  const visits = [...new Set(pages.flatMap((p) => p.visits))].sort((a, b) => VISIT_ORDER.indexOf(a) - VISIT_ORDER.indexOf(b))
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Visits', M, y); y += 16
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  for (const v of visits) {
    if (y > H - 60) break
    const fs = pages.filter((p) => p.visits.includes(v))
    doc.text(`${v}:`, M + 10, y)
    let x = M + 110
    for (const p of fs) { const t = p.form; doc.setTextColor(30, 64, 175); doc.textWithLink(t, x, y, { pageNumber: first[p.form] }); doc.setTextColor(0); x += doc.getTextWidth(t) + 10 }
    y += 13
  }
  footer(1)
  // Bookmarks by form and by visit.
  const byForm = doc.outline.add(null, 'Forms', { pageNumber: 1 })
  for (const pg of pages) doc.outline.add(byForm, `${pg.title} (${pg.form})`, { pageNumber: first[pg.form] })
  const byVisit = doc.outline.add(null, 'Visits', { pageNumber: 1 })
  for (const v of visits) {
    const node = doc.outline.add(byVisit, v, { pageNumber: first[pages.find((p) => p.visits.includes(v))!.form] })
    for (const p of pages.filter((x) => x.visits.includes(v))) doc.outline.add(node, p.title, { pageNumber: first[p.form] })
  }
  doc.setProperties({ title: `${study} annotated CRF`, subject: 'SDTM annotations (training)', creator: 'SDTM Mapping Trainer' })
  return new Uint8Array(doc.output('arraybuffer'))
}
