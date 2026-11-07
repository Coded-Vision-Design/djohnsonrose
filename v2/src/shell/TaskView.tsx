import { useEffect, useMemo, useRef, type KeyboardEvent, type RefObject } from 'react'
import { useOsStore } from '../store/osStore'
import { getApp } from '../apps/registry'
import {
  activateWindow,
  focusWindowElement,
  gridColumns,
  gridIndex,
  keepFocusInside,
  neighbourAfterClose,
  recentWindows,
  restoreFocus,
  switcherKeyFromEvent,
} from '../../../assets/js/windowing/switcher.js'

// Task View, the same as v1's partials/task-view.php: every open window as a
// card, most recently used first, over a dimmed, blurred desktop. It is open
// while the store's taskSwitcherOpen is set, which the taskbar's Task View
// button and the phones' Open apps button both toggle. The order and keys come
// from assets/js/windowing/switcher.js.

const closeTaskView = () => {
  const store = useOsStore.getState()
  if (store.taskSwitcherOpen) store.toggleTaskSwitcher()
}

/** Esc, Done, the shortcut or the space around the cards: focus goes back. */
const cancelTaskView = (opener: Element | null) => {
  closeTaskView()
  restoreFocus(opener)
}

export function TaskView() {
  const open = useOsStore((s) => s.taskSwitcherOpen)
  // Where focus was as it opened, from whichever button or key opened it.
  const opener = useRef<Element | null>(null)

  useEffect(() => {
    const stop = useOsStore.subscribe((state, before) => {
      if (state.taskSwitcherOpen && !before.taskSwitcherOpen) opener.current = document.activeElement
    })
    // Alt+Shift+T, or Win+Tab where the system lets it through.
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (switcherKeyFromEvent(event) !== 'taskView') return
      event.preventDefault()
      if (event.repeat) return
      if (useOsStore.getState().taskSwitcherOpen) cancelTaskView(opener.current)
      else useOsStore.getState().toggleTaskSwitcher()
    }
    // A press anywhere else, such as on the taskbar, closes it, as in Windows.
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (!useOsStore.getState().taskSwitcherOpen || target?.closest?.('[data-task-view], [data-task-view-toggle]')) return
      closeTaskView()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      stop()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [])

  return open ? <TaskViewDialog opener={opener} /> : null
}

function TaskViewDialog({ opener }: { opener: RefObject<Element | null> }) {
  const windows = useOsStore((s) => s.windows)
  const cards = useMemo(() => recentWindows(windows), [windows])
  const dialog = useRef<HTMLDivElement>(null)

  // As it appears: close the shell's panels and put focus on the most recent window's card.
  useEffect(() => {
    useOsStore.getState().closeAllPopups()
    const root = dialog.current
    ;(root?.querySelector<HTMLElement>('.os-task-view-open') ?? root)?.focus()
  }, [])

  const cancel = () => cancelTaskView(opener.current)

  const choose = (id: number) => {
    closeTaskView()
    if (activateWindow(useOsStore.getState(), id)) focusWindowElement(id)
  }

  // Focus moves to the next card first, so it never falls to a window behind.
  const closeCard = (id: number) => {
    const next = neighbourAfterClose(cards, id)
    const root = dialog.current
    const target =
      next === null ? root : root?.querySelector<HTMLElement>(`[data-task-card="${next}"] .os-task-view-open`)
    target?.focus()
    useOsStore.getState().closeWindow(id)
  }

  // Keys inside Task View stay there, so the window behind never sees them.
  // Combinations such as Alt+Q go on to the shell.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.altKey || event.metaKey) return
    event.stopPropagation()
    if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
      return
    }
    const root = dialog.current
    if (!root || keepFocusInside(event, root)) return
    const cardEls = [...root.querySelectorAll<HTMLElement>('.os-task-view-card')]
    const index = cardEls.findIndex((card) => card.contains(document.activeElement))
    if (event.key === 'Delete') {
      if (index === -1) return
      event.preventDefault()
      closeCard(Number(cardEls[index].dataset.taskCard))
      return
    }
    const next = gridIndex(index, event.key, cardEls.length, gridColumns(cardEls.map((card) => card.offsetTop)))
    if (next === null) return
    event.preventDefault()
    cardEls[next].querySelector<HTMLElement>('.os-task-view-open')?.focus()
  }

  return (
    <div
      ref={dialog}
      className="os-task-view"
      data-task-view=""
      role="dialog"
      aria-modal="true"
      aria-label="Task view"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onClick={(event) => {
        if (event.target === event.currentTarget) cancel()
      }}
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
    >
      <div className="os-task-view-head">
        <h2>Task view</h2>
        <button type="button" className="os-task-view-done" onClick={cancel}>
          Done
        </button>
      </div>
      {cards.length === 0 ? (
        <p className="os-task-view-empty">No apps are open.</p>
      ) : (
        <ul
          className="os-task-view-grid"
          onClick={(event) => {
            if (event.target === event.currentTarget) cancel()
          }}
        >
          {cards.map((win) => {
            const icon = getApp(win.app)?.icon
            return (
              <li key={win.id} className="os-task-view-card" data-task-card={win.id}>
                <button type="button" className="os-task-view-open" onClick={() => choose(win.id)}>
                  <span className="os-switch-label">
                    <img src={icon} alt="" />
                    <span>{win.title}</span>
                  </span>
                  <span className="os-switch-thumb">
                    <img src={icon} alt="" />
                  </span>
                </button>
                <button
                  type="button"
                  className="os-task-view-close"
                  title="Close"
                  aria-label={`Close ${win.title}`}
                  onClick={() => closeCard(win.id)}
                >
                  <svg viewBox="0 0 10 10" aria-hidden="true">
                    <path d="M10,1.4L8.6,0L5,3.6L1.4,0L0,1.4L3.6,5L0,8.6L1.4,10L5,6.4l3.6,3.6l1.4-1.4L6.4,5L10,1.4z" />
                  </svg>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
