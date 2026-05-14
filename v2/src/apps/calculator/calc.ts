// Pure calculator state machine — extracted from
// assets/js/components/calculator.js so it can be unit-tested without React.

export type Op = '+' | '-' | '*' | '/' | '%'

export type Key =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.'
  | Op
  | '=' | 'C' | 'CE' | 'back' | 'pm' | 'inv' | 'sq' | 'sqrt'

export interface CalcState {
  display: string
  expression: string
  currentOp: Op | null
  prevValue: number | null
  newNumber: boolean
}

export const initialState: CalcState = {
  display: '0',
  expression: '',
  currentOp: null,
  prevValue: null,
  newNumber: true,
}

const isDigit = (k: string): k is '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' =>
  k.length === 1 && k >= '0' && k <= '9'

const opSymbol = (op: Op) => (op === '*' ? '×' : op === '/' ? '÷' : op)

function evaluate(state: CalcState): string {
  if (state.currentOp === null || state.prevValue === null) return state.display
  const current = parseFloat(state.display)
  let result: number | 'Error' = 0
  switch (state.currentOp) {
    case '+':
      result = state.prevValue + current
      break
    case '-':
      result = state.prevValue - current
      break
    case '*':
      result = state.prevValue * current
      break
    case '/':
      result = current !== 0 ? state.prevValue / current : 'Error'
      break
    case '%':
      result = (state.prevValue / 100) * current
      break
  }
  if (result === 'Error') return 'Error'
  let out = String(result)
  if (out.length > 12 && Number.isFinite(result)) {
    out = (result as number).toPrecision(10)
  }
  return out
}

export function press(state: CalcState, key: Key): CalcState {
  // Digits + decimal
  if (isDigit(key) || key === '.') {
    if (state.newNumber) {
      return { ...state, display: key === '.' ? '0.' : key, newNumber: false }
    }
    if (key === '.' && state.display.includes('.')) return state
    if (state.display === '0' && key !== '.') {
      return { ...state, display: key }
    }
    return { ...state, display: state.display + key }
  }

  // Binary operators
  if (key === '+' || key === '-' || key === '*' || key === '/' || key === '%') {
    const after = state.currentOp && !state.newNumber ? evaluate(state) : state.display
    const prev = parseFloat(after)
    return {
      ...state,
      display: after,
      prevValue: prev,
      currentOp: key,
      expression: `${prev} ${opSymbol(key)}`,
      newNumber: true,
    }
  }

  if (key === '=') {
    const after = evaluate(state)
    return {
      ...state,
      display: after,
      expression: '',
      currentOp: null,
      prevValue: null,
      newNumber: true,
    }
  }

  if (key === 'C') return initialState

  if (key === 'CE') return { ...state, display: '0', newNumber: true }

  if (key === 'back') {
    if (state.display.length > 1) {
      return { ...state, display: state.display.slice(0, -1) }
    }
    return { ...state, display: '0', newNumber: true }
  }

  if (key === 'pm') {
    return { ...state, display: String(parseFloat(state.display) * -1) }
  }

  if (key === 'inv') {
    const n = parseFloat(state.display)
    if (n === 0) return { ...state, display: 'Cannot divide by zero', newNumber: true }
    return { ...state, display: String(1 / n), newNumber: true }
  }

  if (key === 'sq') {
    return { ...state, display: String(parseFloat(state.display) ** 2), newNumber: true }
  }

  if (key === 'sqrt') {
    const n = parseFloat(state.display)
    if (n < 0) return { ...state, display: 'Invalid input', newNumber: true }
    return { ...state, display: String(Math.sqrt(n)), newNumber: true }
  }

  return state
}

/** Map a KeyboardEvent.key to a calculator key, or null if unmapped. */
export function keyboardToCalcKey(eventKey: string): Key | null {
  if (eventKey.length === 1 && eventKey >= '0' && eventKey <= '9') return eventKey as Key
  switch (eventKey) {
    case '.':
    case '+':
    case '-':
    case '*':
    case '/':
    case '%':
      return eventKey as Key
    case 'Enter':
    case '=':
      return '='
    case 'Backspace':
      return 'back'
    case 'Escape':
      return 'C'
    default:
      return null
  }
}
