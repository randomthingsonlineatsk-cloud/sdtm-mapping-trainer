import { describe, test, expect } from 'vitest'
import { passportRecord, sealOf } from '../src/domain/passport'
import { hash } from '../src/domain/util'

describe('Skills Passport record', () => {
  test('seal and code recompute; an edited score breaks the code', () => {
    const basis = 'asha rao|S01:90:standard,S22:85:expert|u-123'
    const h = hash(basis).slice(-10).toUpperCase()
    const code = `SDTM-${h.slice(0, 5)}-${h.slice(5)}`
    const r = passportRecord({ app: 'sdtm-mapping-trainer', appName: 'SDTM Mapping Trainer', certificate: 'Certificate of completion', appUrl: 'x', name: 'Asha Rao', userId: 'u-123', issued: '2026-11-09', basis, code, criteria: [{ label: 'twelve missions', met: true }, { label: 'capstone', met: true }], distinction: false, endorsements: ['Nonclinical data (SEND)'] })
    expect(r.seal).toBe(sealOf(r))
    expect(hash(basis.replace('90', '99')).slice(-10).toUpperCase()).not.toBe(h)
  })
})
