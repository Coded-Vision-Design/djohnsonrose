import { useEffect, useReducer } from 'react'
import { useOsStore } from '../../store/osStore'
import { useCurrentWindow } from '../../windowing/WindowContext'
import {
  CALC_BUTTONS,
  CALC_START,
  calcKeyFromEvent,
  calcPress,
  type CalcButton,
} from '../../../../assets/js/windowing/calculator.js'

// The sums are worked out in assets/js/windowing/calculator.js, shared with v1.

const KEY_CLASS: Record<CalcButton['kind'], string> = {
  fn: 'bg-gray-100 dark:bg-white/5',
  op: 'bg-gray-100 dark:bg-white/5 text-xl',
  num: 'bg-white dark:bg-white/10 text-lg font-bold shadow-xs',
  sign: 'bg-white dark:bg-white/10 font-bold shadow-xs',
  equals: 'bg-win-blue text-white text-xl hover:bg-blue-600! shadow-xs',
}

export default function Calculator() {
  const [state, dispatch] = useReducer(calcPress, CALC_START)
  const windowId = useCurrentWindow().id
  const focusedId = useOsStore((s) => s.focusedWindowId)

  // Keyboard support, only while this Calculator window has focus.
  useEffect(() => {
    if (focusedId !== windowId) return
    const onKey = (e: KeyboardEvent) => {
      const key = calcKeyFromEvent(e, windowId, useOsStore.getState().focusedWindowId)
      if (!key) return
      // Enter would otherwise also press whichever key was clicked last.
      e.preventDefault()
      dispatch(key)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusedId, windowId])

  const displaySize =
    state.display.length > 15
      ? 'text-xl'
      : state.display.length > 10
        ? 'text-3xl'
        : 'text-5xl'

  return (
    <div className="h-full flex flex-col bg-win-bg dark:bg-[#1c1c1c] text-black dark:text-white select-none">
      {/* Mock title strip */}
      <div className="flex items-center justify-between px-4 py-2 h-12 shrink-0">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-sm"
            aria-label="Menu"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-xs font-semibold">Standard</span>
        </div>
        <button
          type="button"
          className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-sm"
          aria-label="History"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {/* Display */}
      <div className="flex flex-col justify-end items-end px-6 py-4 shrink-0 min-h-[120px]">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 h-5 overflow-hidden text-right break-all">
          {state.expression}
        </div>
        <div
          data-calc-display
          aria-live="polite"
          className={`${displaySize} font-semibold overflow-hidden text-right w-full`}
        >
          {state.display}
        </div>
      </div>

      {/* Memory row (mocked, like v1) */}
      <div className="flex justify-around px-2 mb-2 text-[10px] font-bold text-gray-500 dark:text-gray-400 shrink-0">
        {['MC', 'MR', 'M+', 'M-', 'MS', 'M▾'].map((m) => (
          <button
            key={m}
            type="button"
            className="px-3 py-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-sm opacity-60 cursor-default"
          >
            {m}
          </button>
        ))}
      </div>

      {/* Keypad */}
      <div className="grow grid grid-cols-4 gap-0.5 p-1 pb-2">
        {CALC_BUTTONS.map((btn) => (
          <button
            key={btn.val}
            type="button"
            aria-label={btn.name}
            onClick={() => dispatch(btn.val)}
            className={`${KEY_CLASS[btn.kind]} h-full flex items-center justify-center text-sm rounded-sm transition-all hover:bg-gray-200 dark:hover:bg-white/10 border border-transparent active:scale-95 active:bg-gray-300 dark:active:bg-white/20`}
            // Fixed labels from the shared key list, such as <sup>1</sup>&frasl;<sub>x</sub>.
            dangerouslySetInnerHTML={{ __html: btn.label }}
          />
        ))}
      </div>
    </div>
  )
}
