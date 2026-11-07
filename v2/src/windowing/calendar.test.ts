import { describe, it, expect } from 'vitest'
import {
  CALENDAR_DAYS,
  MAX_NOTIFICATIONS,
  addNotification,
  calendarKeyTarget,
  dayLabel,
  daysInMonth,
  isoDate,
  longDate,
  monthGrid,
  monthTitle,
  notificationTime,
  parseIsoDate,
  shiftDay,
  shiftMonth,
  todayIso,
} from '../../../assets/js/windowing/calendar.js'

// The clock's calendar and notification flyout, the same in both builds.

const key = (name: string, shiftKey = false) => ({ key: name, shiftKey })

describe('daysInMonth', () => {
  it('knows the length of every month', () => {
    expect([...Array(12).keys()].map((month) => daysInMonth(2026, month))).toEqual([
      31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
    ])
  })

  it('gives February 29 days in a leap year, and centuries only every 400 years', () => {
    expect(daysInMonth(2024, 1)).toBe(29)
    expect(daysInMonth(2000, 1)).toBe(29)
    expect(daysInMonth(2100, 1)).toBe(28)
  })

  it('throws for a month that does not exist', () => {
    expect(() => daysInMonth(2026, 12)).toThrow(RangeError)
    expect(() => daysInMonth(2026, 1.5)).toThrow(RangeError)
  })
})

describe('dates', () => {
  it('writes a day as YYYY-MM-DD, carrying over into the next month or year', () => {
    expect(isoDate(2026, 10, 7)).toBe('2026-11-07')
    expect(isoDate(2026, 11, 32)).toBe('2027-01-01')
    expect(isoDate(2026, 0, 0)).toBe('2025-12-31')
  })

  it('reads today from the visitor’s own clock, up to the last minute of the day', () => {
    expect(todayIso(new Date(2026, 10, 7, 23, 59))).toBe('2026-11-07')
    expect(todayIso(new Date(2026, 10, 8, 0, 0))).toBe('2026-11-08')
  })

  it('reads back a real day, and nothing else', () => {
    expect(parseIsoDate('2024-02-29')).toEqual({ year: 2024, month: 1, day: 29 })
    expect(parseIsoDate('2026-02-29')).toBeNull()
    expect(parseIsoDate('2026-13-01')).toBeNull()
    expect(parseIsoDate('7 November')).toBeNull()
    expect(parseIsoDate(undefined)).toBeNull()
  })

  it('moves by days across the end of a month and a year', () => {
    expect(shiftDay('2026-11-30', 1)).toBe('2026-12-01')
    expect(shiftDay('2026-01-01', -1)).toBe('2025-12-31')
    expect(shiftDay('2024-02-28', 1)).toBe('2024-02-29')
    expect(shiftDay('2026-02-28', 1)).toBe('2026-03-01')
  })

  it('moves by months, keeping inside a shorter month', () => {
    expect(shiftMonth('2026-12-15', 1)).toBe('2027-01-15')
    expect(shiftMonth('2026-01-15', -1)).toBe('2025-12-15')
    expect(shiftMonth('2026-03-31', -1)).toBe('2026-02-28')
    expect(shiftMonth('2024-01-31', 1)).toBe('2024-02-29')
    expect(shiftMonth('2024-02-29', 12)).toBe('2025-02-28')
  })

  it('throws when asked to move a day that is not one', () => {
    expect(() => shiftDay('nonsense', 1)).toThrow(RangeError)
    expect(() => shiftMonth('2026-02-30', 1)).toThrow(RangeError)
  })
})

describe('labels', () => {
  it('names today in British English, as the flyout’s header does', () => {
    expect(longDate('2026-11-07')).toBe('Saturday 7 November')
    expect(longDate('2027-01-01')).toBe('Friday 1 January')
  })

  it('gives each day a full name for screen readers, and each month a title', () => {
    expect(dayLabel('2026-11-07')).toBe('Saturday 7 November 2026')
    expect(monthTitle('2026-11-07')).toBe('November 2026')
    expect(monthTitle('2024-02-29')).toBe('February 2024')
  })

  it('heads the week with Monday, as in the UK', () => {
    expect(CALENDAR_DAYS.map((day) => day.short)).toEqual(['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'])
    expect(CALENDAR_DAYS[0].long).toBe('Monday')
    expect(CALENDAR_DAYS[6].long).toBe('Sunday')
  })

  it('has no name for a day that does not exist', () => {
    expect(longDate('2026-02-30')).toBe('')
    expect(dayLabel('')).toBe('')
    expect(monthTitle('nonsense')).toBe('')
  })
})

describe('monthGrid', () => {
  const flat = (grid: ReturnType<typeof monthGrid>) => grid.weeks.flat()

  it('shows six weeks of seven days, Monday first, with the neighbouring months filled in', () => {
    const grid = monthGrid('2026-11-07', '2026-11-07')
    expect(grid.title).toBe('November 2026')
    expect(grid.weeks).toHaveLength(6)
    for (const week of grid.weeks) expect(week).toHaveLength(7)
    const days = flat(grid)
    expect(days[0]).toMatchObject({ iso: '2026-10-26', day: 26, inMonth: false })
    expect(days[6]).toMatchObject({ iso: '2026-11-01', day: 1, inMonth: true })
    expect(days[35]).toMatchObject({ iso: '2026-11-30', inMonth: true })
    expect(days[41]).toMatchObject({ iso: '2026-12-06', inMonth: false })
    expect(days.filter((day) => day.inMonth)).toHaveLength(30)
  })

  it('marks today and the selected day, and labels every day in full', () => {
    const days = flat(monthGrid('2026-11-20', '2026-11-07'))
    expect(days.filter((day) => day.today).map((day) => day.iso)).toEqual(['2026-11-07'])
    expect(days.filter((day) => day.selected).map((day) => day.iso)).toEqual(['2026-11-20'])
    expect(days.find((day) => day.iso === '2026-11-07')?.label).toBe('Saturday 7 November 2026')
  })

  it('puts a month that starts on a Sunday in the last column of the first week', () => {
    const days = flat(monthGrid('2026-02-01', null))
    expect(days[6]).toMatchObject({ iso: '2026-02-01', inMonth: true })
    expect(days.slice(0, 6).every((day) => !day.inMonth)).toBe(true)
    expect(days[0].iso).toBe('2026-01-26')
    expect(days[33].iso).toBe('2026-02-28')
    expect(days[34]).toMatchObject({ iso: '2026-03-01', inMonth: false })
  })

  it('starts a month that begins on a Monday in the first cell', () => {
    const days = flat(monthGrid('2026-06-10', null))
    expect(days[0]).toMatchObject({ iso: '2026-06-01', inMonth: true })
  })

  it('shows 29 days for February in a leap year', () => {
    const days = flat(monthGrid('2024-02-10', null))
    expect(days.filter((day) => day.inMonth).map((day) => day.day).at(-1)).toBe(29)
  })

  it('marks no day as today when today is in another month, or unknown', () => {
    expect(flat(monthGrid('2026-12-01', '2026-11-07')).some((day) => day.today)).toBe(false)
    expect(flat(monthGrid('2026-11-01', null)).some((day) => day.today)).toBe(false)
  })

  it('throws for a day that does not exist', () => {
    expect(() => monthGrid('2026-02-30', null)).toThrow(RangeError)
  })
})

describe('calendarKeyTarget', () => {
  it('moves a day with the arrows, and a week up and down', () => {
    expect(calendarKeyTarget('2026-11-07', key('ArrowRight'))).toBe('2026-11-08')
    expect(calendarKeyTarget('2026-11-07', key('ArrowLeft'))).toBe('2026-11-06')
    expect(calendarKeyTarget('2026-11-07', key('ArrowUp'))).toBe('2026-10-31')
    expect(calendarKeyTarget('2026-11-07', key('ArrowDown'))).toBe('2026-11-14')
  })

  it('crosses into the next and previous months', () => {
    expect(calendarKeyTarget('2026-11-30', key('ArrowRight'))).toBe('2026-12-01')
    expect(calendarKeyTarget('2026-01-01', key('ArrowLeft'))).toBe('2025-12-31')
  })

  it('goes to the start and end of the week with Home and End', () => {
    expect(calendarKeyTarget('2026-11-07', key('Home'))).toBe('2026-11-02')
    expect(calendarKeyTarget('2026-11-07', key('End'))).toBe('2026-11-08')
    expect(calendarKeyTarget('2026-11-08', key('End'))).toBe('2026-11-08')
  })

  it('changes month with Page Up and Page Down, and year with Shift', () => {
    expect(calendarKeyTarget('2026-03-31', key('PageUp'))).toBe('2026-02-28')
    expect(calendarKeyTarget('2024-01-31', key('PageDown'))).toBe('2024-02-29')
    expect(calendarKeyTarget('2024-02-29', key('PageDown', true))).toBe('2025-02-28')
    expect(calendarKeyTarget('2026-11-07', key('PageUp', true))).toBe('2025-11-07')
  })

  it('leaves other keys alone, and ignores a day that does not exist', () => {
    expect(calendarKeyTarget('2026-11-07', key('Enter'))).toBeNull()
    expect(calendarKeyTarget('2026-11-07', key('a'))).toBeNull()
    expect(calendarKeyTarget('nonsense', key('ArrowRight'))).toBeNull()
  })
})

describe('notifications', () => {
  it('lists the newest first, each with its own id and time', () => {
    const first = addNotification([], 'Link copied', 1000)
    const both = addNotification(first, 'Press Ctrl+V to paste', 2000)
    expect(both.map((note) => note.message)).toEqual(['Press Ctrl+V to paste', 'Link copied'])
    expect(both.map((note) => note.time)).toEqual([2000, 1000])
    expect(new Set(both.map((note) => note.id)).size).toBe(2)
  })

  it('keeps the same message shown twice as two notifications', () => {
    const twice = addNotification(addNotification([], 'Link copied', 1), 'Link copied', 2)
    expect(twice).toHaveLength(2)
    expect(twice[0].id).not.toBe(twice[1].id)
  })

  it('keeps no more than the most recent few', () => {
    let list = addNotification([], 'first', 0)
    for (let i = 1; i <= MAX_NOTIFICATIONS; i++) list = addNotification(list, `message ${i}`, i)
    expect(list).toHaveLength(MAX_NOTIFICATIONS)
    expect(list[0].message).toBe(`message ${MAX_NOTIFICATIONS}`)
    expect(list.some((note) => note.message === 'first')).toBe(false)
  })

  it('ignores an empty message, and leaves the list as it was', () => {
    const list = addNotification([], 'Link copied', 1)
    expect(addNotification(list, '   ', 2)).toBe(list)
    expect(addNotification(list, null as unknown as string, 2)).toBe(list)
  })

  it('tells the time of each in the taskbar clock’s 24-hour form', () => {
    expect(notificationTime(new Date(2026, 10, 7, 9, 5).getTime())).toBe('09:05')
    expect(notificationTime(new Date(2026, 10, 7, 0, 0).getTime())).toBe('00:00')
    expect(notificationTime(Number.NaN)).toBe('')
  })
})
