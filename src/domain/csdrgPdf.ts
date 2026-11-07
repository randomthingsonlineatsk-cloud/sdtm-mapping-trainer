// csdrg.pdf, written in the browser: a title page, a linked table of contents, the numbered
// sections with their tables (header row repeated on each page), bookmarks for every section,
// and page numbers. Fonts are the PDF standard Helvetica, so the file is searchable text.

import { jsPDF } from 'jspdf'
import type { Csdrg } from './csdrg'

const W = 595, H = 842, M = 50, BOTTOM = H - 50
const ascii = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...').replace(/·/g, '-').replace(/×/g, 'x').replace(/[^\x20-\x7E\n]/g, '')

export function csdrgPdf(study: string, g: Csdrg, meta: { author: string; date: string; title: string }): Uint8Array {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  doc.setProperties({ title: `${study} Clinical Study Data Reviewer's Guide`, subject: 'cSDRG (training, fictional study)', author: meta.author, creator: 'SDTM Mapping Trainer' })
  // Title page.
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.text("Clinical Study Data Reviewer's Guide", M, 200)
  doc.setFontSize(14); doc.text(study, M, 230)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  doc.text(doc.splitTextToSize(ascii(meta.title), W - 2 * M), M, 256)
  doc.text(`Prepared by: ${ascii(meta.author || 'not given')}`, M, 340); doc.text(`Date: ${meta.date}`, M, 355)
  doc.setTextColor(110); doc.text('Fictional study and sponsor, for training. Section layout follows the PHUSE cSDRG template.', M, 380); doc.setTextColor(0)
  // Contents on page 2, filled in at the end.
  doc.addPage(); const tocPage = 2
  const start: { num: string; title: string; level: number; page: number }[] = []
  doc.addPage(); let y = M
  const need = (h: number) => { if (y + h > BOTTOM) { doc.addPage(); y = M } }
  for (const s of g.sections) {
    const fs = s.level === 1 ? 14 : s.level === 2 ? 11.5 : 10.5
    need(fs + 30); if (s.level === 1 && y > M) y += 8
    doc.setFont('helvetica', 'bold'); doc.setFontSize(fs); doc.text(ascii(`${s.num}  ${s.title}`), M, y + fs)
    start.push({ num: s.num, title: s.title, level: s.level, page: doc.getNumberOfPages() })
    y += fs + 10
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5)
    for (const para of s.paras) {
      const lines: string[] = doc.splitTextToSize(ascii(para), W - 2 * M)
      for (const l of lines) { need(13); doc.text(l, M, y + 9); y += 13 }
      y += 5
    }
    if (s.table) {
      const t = s.table, tw = W - 2 * M, ws = t.widths.map((x) => x * tw)
      const cells = (r: string[], bold: boolean) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(8); return r.map((c, i) => doc.splitTextToSize(ascii(c), ws[i] - 6) as string[]) }
      const draw = (r: string[], bold: boolean) => {
        const cs = cells(r, bold), h = Math.max(...cs.map((c) => c.length)) * 10 + 6
        if (bold) { doc.setFillColor(232, 238, 247); doc.rect(M, y, tw, h, 'F') }
        let x = M
        cs.forEach((c, i) => { doc.setDrawColor(170); doc.rect(x, y, ws[i], h); doc.text(c, x + 3, y + 10); x += ws[i] })
        y += h
      }
      const headH = Math.max(...cells(t.head, true).map((c) => c.length)) * 10 + 6
      need(headH + 20); draw(t.head, true)
      for (const r of t.rows) {
        const h = Math.max(...cells(r, false).map((c) => c.length)) * 10 + 6
        if (y + h > BOTTOM) { doc.addPage(); y = M; draw(t.head, true) }
        draw(r, false)
      }
      y += 12
    }
  }
  // Contents with links.
  doc.setPage(tocPage); y = M
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text('Contents', M, y + 14); y += 34
  doc.setFontSize(9.5)
  for (const s of start) {
    if (y > BOTTOM) break
    doc.setFont('helvetica', s.level === 1 ? 'bold' : 'normal')
    const label = ascii(`${s.num}  ${s.title}`), x = M + (s.level - 1) * 14
    doc.setTextColor(30, 64, 175); doc.textWithLink(label, x, y, { pageNumber: s.page }); doc.setTextColor(0)
    doc.text(String(s.page), W - M, y, { align: 'right' }); y += s.level === 1 ? 16 : 13
  }
  // Bookmarks, nested by section level.
  const parents: unknown[] = [null]
  for (const s of start) { const node = doc.outline.add(parents[s.level - 1] as never, ascii(`${s.num} ${s.title}`), { pageNumber: s.page }); parents[s.level] = node; parents.length = s.level + 1 }
  // Page numbers.
  const n = doc.getNumberOfPages()
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(120); doc.text(`${study} cSDRG - fictional study for training`, M, H - 25); doc.text(`Page ${i} of ${n}`, W - M, H - 25, { align: 'right' }); doc.setTextColor(0) }
  return new Uint8Array(doc.output('arraybuffer'))
}
