import { useEffect, useReducer } from 'react'
import { useOsStore } from '../../store/osStore'
import { press, initialState, keyboardToCalcKey, type CalcState, type Key } from './calc'

interface Button {
  label: React.ReactNode
  val: Key
  className: string
}

const NUM_BTN =
  'bg-white dark:bg-white/10 text-lg font-bold shadow-sm'
const OP_BTN = 'bg-gray-100 dark:bg-white/5'
const OP_BTN_LG = 'bg-gray-100 dark:bg-white/5 text-xl'

const BUTTONS: Button[] = [
  { label: '%', val: '%', className: OP_BTN },
  { label: 'CE', val: 'CE', className: OP_BTN },
  { label: 'C', val: 'C', className: OP_BTN },
  { label: '⌫', val: 'back', className: OP_BTN },
  { label: <span><sup>1</sup>⁄<sub>x</sub></span>, val: 'inv', className: OP_BTN },
  { label: 'x²', val: 'sq', className: OP_BTN },
  { label: <span><sup>2</sup>√x</span>, val: 'sqrt', className: OP_BTN },
  { label: '÷', val: '/', className: OP_BTN_LG },
  { label: '7', val: '7', className: NUM_BTN },
  { label: '8', val: '8', className: NUM_BTN },
  { label: '9', val: '9', className: NUM_BTN },
  { label: '×', val: '*', className: OP_BTN_LG },
  { label: '4', val: '4', className: NUM_BTN },
  { label: '5', val: '5', className: NUM_BTN },
  { label: '6', val: '6', className: NUM_BTN },
  { label: '−', val: '-', className: OP_BTN_LG },
  { label: '1', val: '1', className: NUM_BTN },
  { label: '2', val: '2', className: NUM_BTN },
  { label: '3', val: '3', className: NUM_BTN },
  { label: '+', val: '+', className: OP_BTN_LG },
  { label: <span><sup>+</sup>⁄<sub>−</sub></span>, val: 'pm', className: NUM_BTN },
  { label: '0', val: '0', className: NUM_BTN },
  { label: '.', val: '.', className: NUM_BTN },
  { label: '=', val: '=', className: 'bg-win-blue text-white text-xl hover:!bg-blue-600 shadow-sm' },
]

function reducer(state: CalcState, key: Key): CalcState {
  return press(state, key)
}

export default function Calculator() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const focusedId = useOsStore((s) => s.focusedWindowId)
  const focusedApp = useOsStore((s) =>
    s.windows.find((w) => w.id === s.focusedWindowId)?.app,
  )
  const isFocused = focusedApp === 'calculator'

  // Keyboard support — only when the calculator window owns focus.
  useEffect(() => {
    if (!isFocused) return
    const onKey = (e: KeyboardEvent) => {
      const key = keyboardToCalcKey(e.key)
      if (key) {
        e.preventDefault()
        dispatch(key)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isFocused, focusedId])

  const displaySize =
    state.display.length > 15
      ? 'text-xl'
      : state.display.length > 10
        ? 'text-3xl'
        : 'text-5xl'

  return (
    <div className="h-full flex flex-col bg-[#f3f3f3] dark:bg-[#1c1c1c] text-black dark:text-white select-none">
      {/* Mock title strip */}
      <div className="flex items-center justify-between px-4 py-2 h-12 shrink-0">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded"
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
          className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded"
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
        <div className={`${displaySize} font-semibold overflow-hidden text-right w-full`}>
          {state.display}
        </div>
      </div>

      {/* Memory row (mocked, like v1) */}
      <div className="flex justify-around px-2 mb-2 text-[10px] font-bold text-gray-500 dark:text-gray-400 shrink-0">
        {['MC', 'MR', 'M+', 'M-', 'MS', 'M▾'].map((m) => (
          <button
            key={m}
            type="button"
            className="px-3 py-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded opacity-60 cursor-default"
          >
            {m}
          </button>
        ))}
      </div>

      {/* Keypad */}
      <div className="flex-grow grid grid-cols-4 gap-0.5 p-1 pb-2">
        {BUTTONS.map((btn, i) => (
          <button
            key={`${btn.val}-${i}`}
            type="button"
            onClick={() => dispatch(btn.val)}
            className={`${btn.className} h-full flex items-center justify-center text-sm rounded transition-all hover:bg-gray-200 dark:hover:bg-white/10 border border-transparent active:scale-95 active:bg-gray-300 dark:active:bg-white/20`}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  )
}
