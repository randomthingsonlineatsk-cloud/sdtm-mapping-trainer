// The certificate as a one-page landscape PDF.
import { jsPDF } from 'jspdf'
import type { Certificate } from './certificate'

const ascii = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/·/g, '-').replace(/[^\x20-\x7E]/g, '')
export function certificatePdf(c: Certificate, name: string, userId: string, issued: string): Uint8Array {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
  const W = 842, H = 595
  doc.setProperties({ title: 'SDTM Mapping Trainer certificate', subject: 'Certificate of completion (training)', creator: 'SDTM Mapping Trainer' })
  doc.setDrawColor(30, 64, 175); doc.setLineWidth(3); doc.rect(24, 24, W - 48, H - 48); doc.setLineWidth(0.8); doc.rect(32, 32, W - 64, H - 64)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(90); doc.text('CERTIFICATE OF COMPLETION - TRAINING', W / 2, 88, { align: 'center' })
  doc.setTextColor(0); doc.setFont('helvetica', 'bold'); doc.setFontSize(30); doc.text(ascii(name), W / 2, 150, { align: 'center' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(13)
  const studies = c.studies.length > 1 ? `the fictional studies ${c.studies.join(' and ')}` : `the fictional study ${c.studies[0]}`
  doc.text(doc.splitTextToSize(`has completed the SDTM Mapping Trainer course: raw clinical trial data mapped to CDISC SDTM on ${studies}, passing ${c.passed.length} of ${c.total} scored missions, including the capstone submission package.`, W - 200), W / 2, 190, { align: 'center' })
  doc.setFontSize(8.5); doc.setTextColor(60)
  const lines: string[] = doc.splitTextToSize(c.passed.map((r) => `${r.id} ${ascii(r.title)} (${r.score}%, ${r.level})`).join('   -   '), W - 160)
  doc.text(lines, W / 2, 262, { align: 'center' })
  doc.setTextColor(0); doc.setFont('courier', 'bold'); doc.setFontSize(14); doc.text(`Verification code ${c.code}`, W / 2, H - 150, { align: 'center' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90)
  doc.text(`User ID ${ascii(userId)} - issued ${issued}`, W / 2, H - 128, { align: 'center' })
  doc.text('A practice certificate from a training simulator with fictional studies; not an accredited qualification.', W / 2, H - 100, { align: 'center' })
  doc.text('Built by Khan Gulrez Shagufa Fazal Ahmed', W / 2, H - 84, { align: 'center' })
  return new Uint8Array(doc.output('arraybuffer'))
}
