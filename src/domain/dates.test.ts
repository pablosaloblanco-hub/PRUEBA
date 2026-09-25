process.env.TZ = 'Pacific/Kiritimati'
import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  compareDates,
  currentMonth,
  dayOf,
  daysInMonth,
  formatDateLabel,
  formatDayHeader,
  formatMonthLabel,
  formatShortMonth,
  isLocalDate,
  isMonthKey,
  lastNMonths,
  monthKeyOf,
  todayLocal,
} from './dates'

const norm = (s: string): string => s.replace(/\s/g, ' ')

describe('timezone', () => {
  it('runs under Pacific/Kiritimati (UTC+14)', () => {
    expect(process.env.TZ).toBe('Pacific/Kiritimati')
  })
})

describe('todayLocal / currentMonth', () => {
  it('uses local calendar fields, never UTC', () => {
    expect(todayLocal(new Date(2026, 8, 25, 23, 50))).toBe('2026-09-25')
    expect(todayLocal(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01')
    expect(todayLocal(new Date(2025, 11, 31, 23, 59, 59))).toBe('2025-12-31')
  })

  it('zero-pads month and day', () => {
    expect(todayLocal(new Date(2026, 2, 5, 12))).toBe('2026-03-05')
  })

  it('defaults to the current clock and returns a valid LocalDate', () => {
    const t = todayLocal()
    expect(isLocalDate(t)).toBe(true)
    const now = new Date()
    expect(t).toBe(todayLocal(now))
  })

  it('currentMonth is the month of todayLocal', () => {
    expect(currentMonth(new Date(2026, 8, 25, 23, 50))).toBe('2026-09')
    expect(currentMonth(new Date(2026, 0, 1, 0, 30))).toBe('2026-01')
    expect(isMonthKey(currentMonth())).toBe(true)
  })
})

describe('isLocalDate', () => {
  it.each(['2026-09-25', '2024-02-29', '2000-02-29', '2026-01-01', '2026-12-31', '2026-04-30'])(
    'accepts %s',
    (d) => {
      expect(isLocalDate(d)).toBe(true)
    },
  )

  it.each([
    '2025-02-29',
    '2025-02-30',
    '2100-02-29',
    '2025-04-31',
    '2026-9-3',
    '2026-09-3',
    '2026-13-01',
    '2026-00-10',
    '2026-09-00',
    '2026-09-32',
    '26-09-03',
    '2026/09/03',
    '2026-09-25T00:00:00',
    ' 2026-09-25',
    '',
    'hoy',
  ])('rejects %j', (d) => {
    expect(isLocalDate(d)).toBe(false)
  })
})

describe('isMonthKey', () => {
  it('accepts YYYY-MM with a real month', () => {
    expect(isMonthKey('2026-09')).toBe(true)
    expect(isMonthKey('2026-01')).toBe(true)
    expect(isMonthKey('2026-12')).toBe(true)
  })
  it('rejects malformed or impossible months', () => {
    expect(isMonthKey('2026-13')).toBe(false)
    expect(isMonthKey('2026-00')).toBe(false)
    expect(isMonthKey('2026-9')).toBe(false)
    expect(isMonthKey('2026-09-01')).toBe(false)
    expect(isMonthKey('')).toBe(false)
  })
})

describe('monthKeyOf / dayOf / compareDates', () => {
  it('monthKeyOf slices the month', () => {
    expect(monthKeyOf('2026-09-25')).toBe('2026-09')
  })
  it('dayOf returns the day as a number', () => {
    expect(dayOf('2026-09-25')).toBe(25)
    expect(dayOf('2026-09-05')).toBe(5)
  })
  it('compareDates is lexicographic', () => {
    expect(compareDates('2026-09-01', '2026-09-02')).toBe(-1)
    expect(compareDates('2026-09-02', '2026-09-01')).toBe(1)
    expect(compareDates('2026-09-02', '2026-09-02')).toBe(0)
    expect(compareDates('2025-12-31', '2026-01-01')).toBe(-1)
  })
})

describe('daysInMonth', () => {
  it('leap years: 2024 = 29, 2100 = 28, 2000 = 29, 2025 = 28', () => {
    expect(daysInMonth('2024-02')).toBe(29)
    expect(daysInMonth('2100-02')).toBe(28)
    expect(daysInMonth('2000-02')).toBe(29)
    expect(daysInMonth('2025-02')).toBe(28)
  })
  it('30- and 31-day months', () => {
    expect(daysInMonth('2026-09')).toBe(30)
    expect(daysInMonth('2026-04')).toBe(30)
    expect(daysInMonth('2026-06')).toBe(30)
    expect(daysInMonth('2026-11')).toBe(30)
    expect(daysInMonth('2026-01')).toBe(31)
    expect(daysInMonth('2026-12')).toBe(31)
    expect(daysInMonth('2026-08')).toBe(31)
  })
})

describe('addMonths', () => {
  it('crosses year boundaries in both directions', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-09', -12)).toBe('2025-09')
    expect(addMonths('2026-09', 15)).toBe('2027-12')
    expect(addMonths('2026-09', -21)).toBe('2024-12')
    expect(addMonths('2026-09', 0)).toBe('2026-09')
  })
})

describe('addDays', () => {
  it('does not skip days across DST changes (last Sunday of March / October)', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29')
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30')
    expect(addDays('2026-03-30', -1)).toBe('2026-03-29')
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25')
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26')
    expect(addDays('2026-10-26', -1)).toBe('2026-10-25')
  })
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01')
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01')
    expect(addDays('2026-09-25', 10)).toBe('2026-10-05')
    expect(addDays('2026-09-25', 0)).toBe('2026-09-25')
    expect(addDays('2026-09-25', 365)).toBe('2027-09-25')
  })
})

describe('lastNMonths', () => {
  it("lastNMonths('2026-09', 6)", () => {
    expect(lastNMonths('2026-09', 6)).toEqual(['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'])
  })
  it("lastNMonths('2026-02', 12) starts in '2025-03'", () => {
    const r = lastNMonths('2026-02', 12)
    expect(r).toHaveLength(12)
    expect(r[0]).toBe('2025-03')
    expect(r[11]).toBe('2026-02')
    expect(r).toEqual([
      '2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08',
      '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02',
    ])
  })
  it('n = 1 and n = 0', () => {
    expect(lastNMonths('2026-09', 1)).toEqual(['2026-09'])
    expect(lastNMonths('2026-09', 0)).toEqual([])
  })
})

describe('formatting (Intl es-ES, local noon)', () => {
  it("formatMonthLabel('2026-09') = 'septiembre 2026'", () => {
    expect(norm(formatMonthLabel('2026-09'))).toBe('septiembre 2026')
    expect(norm(formatMonthLabel('2026-01'))).toBe('enero 2026')
    expect(norm(formatMonthLabel('2025-12'))).toBe('diciembre 2025')
  })

  it('formatDayHeader: Hoy / Ayer / weekday, day month', () => {
    const today = '2026-09-25'
    expect(formatDayHeader('2026-09-25', today)).toBe('Hoy')
    expect(formatDayHeader('2026-09-24', today)).toBe('Ayer')
    expect(norm(formatDayHeader('2026-09-18', today))).toBe('viernes, 18 sep')
    expect(norm(formatDayHeader('2026-09-17', today))).toBe('jueves, 17 sep')
    expect(norm(formatDayHeader('2026-09-28', today))).toBe('lunes, 28 sep')
    expect(norm(formatDayHeader('2026-03-01', today))).toBe('domingo, 1 mar')
  })

  it("formatDayHeader 'Ayer' across the year boundary", () => {
    expect(formatDayHeader('2025-12-31', '2026-01-01')).toBe('Ayer')
    expect(formatDayHeader('2026-01-01', '2026-01-01')).toBe('Hoy')
    expect(norm(formatDayHeader('2025-12-30', '2026-01-01'))).toBe('martes, 30 dic')
  })

  it('formatDayHeader never adds a trailing dot to the month', () => {
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, '0')
      const label = formatDayHeader(`2026-${mm}-10`, '2027-01-01')
      expect(label).not.toMatch(/\.$/)
      expect(label).toMatch(/^[a-záéíóú]+, 10 [a-z]{3}$/)
    }
  })

  it('formatShortMonth', () => {
    expect(formatShortMonth('2026-09')).toBe('sep')
    expect(formatShortMonth('2026-01')).toBe('ene')
    expect(formatShortMonth('2026-05')).toBe('may')
    expect(formatShortMonth('2026-12')).toBe('dic')
  })

  it('formatDateLabel', () => {
    expect(formatDateLabel('2026-09-25')).toBe('25/09/2026')
    expect(formatDateLabel('2026-01-05')).toBe('05/01/2026')
  })
})
