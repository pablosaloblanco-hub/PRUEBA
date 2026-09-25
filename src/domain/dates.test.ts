process.env.TZ = 'Pacific/Kiritimati'
import { describe, expect, it } from 'vitest'

describe('dates (placeholder until src/domain/dates.ts exists)', () => {
  it('runs under the Pacific/Kiritimati timezone', () => {
    expect(process.env.TZ).toBe('Pacific/Kiritimati')
  })
})
