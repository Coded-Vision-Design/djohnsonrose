export interface CalendarDayName {
  /** "Mo", the column heading. */
  short: string
  /** "Monday", what a screen reader hears for the column. */
  long: string
}

/** Monday first, as in the UK. */
export const CALENDAR_DAYS: readonly CalendarDayName[]
export const CALENDAR_MONTHS: readonly string[]
export const MAX_NOTIFICATIONS: number

export interface CalendarDay {
  /** 'YYYY-MM-DD'. */
  iso: string
  day: number
  /** False for the days of the months either side. */
  inMonth: boolean
  today: boolean
  selected: boolean
  /** "Saturday 7 November 2026". */
  label: string
}

export interface MonthGrid {
  /** "November 2026". */
  title: string
  /** Six weeks of seven days, Monday first. */
  weeks: CalendarDay[][]
}

export interface ShellNotification {
  id: number
  message: string
  /** When it was shown, in milliseconds. */
  time: number
}

/** The days in a month, 0 for January. Throws for a month that does not exist. */
export function daysInMonth(year: number, month: number): number
/** 'YYYY-MM-DD' for a year, a month (0 for January) and a day. Days past the end carry over. */
export function isoDate(year: number, month: number, day: number): string
/** Today, or the day of any Date, by the visitor's own clock. */
export function todayIso(now?: Date): string
/** The parts of a 'YYYY-MM-DD' day, or null when it is not a real one. */
export function parseIsoDate(iso: string | null | undefined): { year: number; month: number; day: number } | null
/** Throws for a day that does not exist. */
export function shiftDay(iso: string, days: number): string
/** Kept inside a shorter month. Throws for a day that does not exist. */
export function shiftMonth(iso: string, months: number): string
/** "Saturday 7 November". */
export function longDate(iso: string): string
/** "Saturday 7 November 2026". */
export function dayLabel(iso: string): string
/** "November 2026". */
export function monthTitle(iso: string): string
/** The month the selected day is in. Throws for a day that does not exist. */
export function monthGrid(selected: string, today: string | null): MonthGrid
/** Where a key moves the selected day, or null for a key the grid does not use. */
export function calendarKeyTarget(iso: string, event: { key: string; shiftKey?: boolean }): string | null
/** The list with a new notification on top, or the same list for an empty message. */
export function addNotification(list: readonly ShellNotification[], message: string, time: number): ShellNotification[]
/** "09:05". Empty for a time that is not one. */
export function notificationTime(time: number): string
