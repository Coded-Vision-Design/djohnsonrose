import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type SyntheticEvent } from 'react'
import { useOsStore } from '../store/osStore'
import {
  CALENDAR_DAYS,
  calendarKeyTarget,
  longDate,
  monthGrid,
  notificationTime,
  shiftMonth,
  todayIso,
} from '../../../assets/js/windowing/calendar.js'

// 1:1 port of partials/calendar-flyout.php: the clock's flyout, with the toasts
// shown this session above a Monday-first month grid. The dates and keys are
// worked out in calendar.js, shared with v1, and the looks are in windowing.css.

export function CalendarFlyout() {
  const open = useOsStore((s) => s.calendarOpen)
  // Mounted only while open, so that each opening starts on today.
  return open ? <CalendarPanel /> : null
}

const CLOCK = '[data-tray-item="clock"]'

const focusSelected = (root: HTMLElement | null) =>
  root?.querySelector<HTMLElement>('[data-calendar-day][tabindex="0"]')?.focus({ preventScroll: true })

// Touches and right-clicks stay inside, so that neither opens the desktop's menu.
const keepInside = (e: SyntheticEvent) => e.stopPropagation()

function CalendarPanel() {
  const close = useOsStore((s) => s.closeAllPopups)
  const notifications = useOsStore((s) => s.notifications)
  const clearNotifications = useOsStore((s) => s.clearNotifications)
  // Reading the clock moves the flyout on to the new day at midnight.
  useOsStore((s) => s.clock.date)
  const today = todayIso()
  // The day the grid's one tab stop is on. Its month is the month shown.
  const [selected, setSelected] = useState(today)
  const grid = useMemo(() => monthGrid(selected, today), [selected, today])
  const ref = useRef<HTMLDivElement>(null)
  // Set when the grid moves the selected day, so that focus follows it. It
  // starts set, so that focus goes to today as the flyout opens.
  const follow = useRef(true)

  useEffect(() => {
    if (!follow.current) return
    follow.current = false
    focusSelected(ref.current)
  }, [selected])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return
      // The clock toggles the flyout itself; let its onClick run.
      if ((e.target as Element | null)?.closest?.('[data-popup-toggle]')) return
      close()
    }
    const id = window.setTimeout(() => document.addEventListener('mousedown', onDown), 0)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('mousedown', onDown)
    }
  }, [close])

  // Esc closes it and gives focus back to the clock.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      close()
      document.querySelector<HTMLElement>(CLOCK)?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  const select = (iso: string) => {
    if (iso === selected) {
      focusSelected(ref.current)
      return
    }
    follow.current = true
    setSelected(iso)
  }

  // The button goes with the notifications, so focus moves on to the calendar.
  const clearAll = () => {
    clearNotifications()
    focusSelected(ref.current)
  }

  const onGridKey = (e: KeyboardEvent) => {
    const target = calendarKeyTarget(selected, e)
    if (!target) return
    e.preventDefault()
    select(target)
  }

  return (
    <div
      ref={ref}
      data-calendar-flyout=""
      role="dialog"
      aria-label="Notifications and calendar"
      className="os-calendar-flyout"
      onTouchStart={keepInside}
      onTouchMove={keepInside}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <section data-notification-centre="" className="os-calendar-panel os-notify-panel" aria-labelledby="os-notifications-heading">
        <div className="os-notify-head">
          <h2 id="os-notifications-heading">Notifications</h2>
          {notifications.length > 0 && (
            <button type="button" className="os-calendar-text-button" data-notifications-clear="" onClick={clearAll}>
              Clear all
            </button>
          )}
        </div>
        {notifications.length > 0 ? (
          <ul className="os-notify-list">
            {notifications.map((note) => (
              <li key={note.id} data-notification="" className="os-notify-item">
                <p>{note.message}</p>
                <time dateTime={notificationTime(note.time)}>{notificationTime(note.time)}</time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="os-notify-empty">No new notifications</p>
        )}
      </section>

      <section data-calendar-panel="" className="os-calendar-panel" aria-labelledby="os-calendar-today">
        <div className="os-calendar-head">
          <h2 id="os-calendar-today" data-calendar-date="">
            {longDate(today)}
          </h2>
        </div>
        <div className="os-calendar-body">
          <div className="os-calendar-nav">
            <p id="os-calendar-month" data-calendar-title="" aria-live="polite">
              {grid.title}
            </p>
            <button type="button" className="os-calendar-text-button" data-calendar-today="" onClick={() => setSelected(today)}>
              Today
            </button>
            <button
              type="button"
              className="os-calendar-step"
              aria-label="Previous month"
              title="Previous month"
              onClick={() => setSelected(shiftMonth(selected, -1))}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path fill="currentColor" d="M8 4.3 2.3 10l1 1L8 6.3l4.7 4.7 1-1z" />
              </svg>
            </button>
            <button
              type="button"
              className="os-calendar-step"
              aria-label="Next month"
              title="Next month"
              onClick={() => setSelected(shiftMonth(selected, 1))}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path fill="currentColor" d="M8 11.7 2.3 6l1-1L8 9.7 12.7 5l1 1z" />
              </svg>
            </button>
          </div>
          <table role="grid" className="os-calendar-grid" aria-labelledby="os-calendar-month" onKeyDown={onGridKey}>
            <thead role="rowgroup">
              <tr role="row">
                {CALENDAR_DAYS.map((name) => (
                  <th key={name.long} role="columnheader" scope="col" aria-label={name.long}>
                    {name.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody role="rowgroup">
              {grid.weeks.map((week, row) => (
                <tr key={row} role="row">
                  {week.map((cell) => (
                    <td
                      key={cell.iso}
                      role="gridcell"
                      className="os-calendar-day"
                      data-calendar-day={cell.iso}
                      data-outside={cell.inMonth ? undefined : ''}
                      aria-label={cell.label}
                      aria-selected={cell.selected}
                      aria-current={cell.today ? 'date' : undefined}
                      tabIndex={cell.selected ? 0 : -1}
                      onClick={() => select(cell.iso)}
                    >
                      <span>{cell.day}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
