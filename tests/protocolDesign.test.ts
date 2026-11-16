import { describe, expect, test } from 'vitest'
import file from './fixtures/GLV-12-301-trial-design.json?raw'
import { readProtocolDesign, designReference, referenceDesign, designBuilt } from '../src/domain/design'

describe('trial design reference from the Protocol Builder', () => {
  test('a GLV-12-301 file loads; another study or format is refused', () => {
    const ref = readProtocolDesign(file, 'GLV-12-301-trial-design.json', 'GLV-12-301')
    expect(ref.datasets.TA).toHaveLength(9)
    expect(() => readProtocolDesign(file, 'x.json', 'HRP-301')).toThrow(/GLV-12-301/)
    expect(() => readProtocolDesign('{"format":"other"}', 'x.json', 'GLV-12-301')).toThrow(/not a Protocol Builder/)
  })
  test('the protocol’s design agrees with the built-in reference; data-derived TS stays the trainer’s', () => {
    const own = referenceDesign('3.4', 1), mixed = designReference('3.4', 1, readProtocolDesign(file, 'f', 'GLV-12-301'))
    for (const d of ['TA', 'TE', 'TV', 'TI']) expect(designBuilt(d, mixed[d], '3.4').rows.map(({ __trace, ...r }) => r)).toEqual(designBuilt(d, own[d], '3.4').rows.map(({ __trace, ...r }) => r))
    for (const cd of ['ACTSUB', 'SSTDTC', 'SENDTC', 'DCUTDTC', 'SDTIGVER']) expect(mixed.TS.find((r) => r.TSPARMCD === cd)?.TSVAL).toBe(own.TS.find((r) => r.TSPARMCD === cd)?.TSVAL)
    expect(mixed.TS.some((r) => r.TSPARMCD === 'OUTMSSEC')).toBe(true)
  })
})
