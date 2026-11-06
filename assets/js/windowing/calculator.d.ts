export type CalcOp = '+' | '-' | '*' | '/'

export type CalcKey =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.'
  | CalcOp
  | '%' | '=' | 'C' | 'CE' | 'back' | 'pm' | 'inv' | 'sq' | 'sqrt'

export interface CalcState {
  display: string
  expression: string
  currentOp: CalcOp | null
  prevValue: number | null
  newNumber: boolean
  pending: boolean
  error: boolean
}

export interface CalcButton {
  val: CalcKey
  /** HTML. */
  label: string
  /** What a screen reader says. */
  name: string
  kind: 'fn' | 'op' | 'num' | 'sign' | 'equals'
}

export const CALC_START: Readonly<CalcState>
export const CALC_ERRORS: Readonly<{
  divideByZero: string
  undefinedResult: string
  invalid: string
  overflow: string
}>
export const CALC_BUTTONS: CalcButton[]
export const CALC_IGNORE_KEYS_IN: string

export function formatCalc(value: number): string | null
export function calcPress(state: CalcState, key: CalcKey): CalcState
export function calcKeyFor(eventKey: string): CalcKey | null
export function calcKeyFromEvent(
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'> & { target: EventTarget | null },
  windowId: string | number | null | undefined,
  focusedWindowId: string | number | null | undefined,
): CalcKey | null
