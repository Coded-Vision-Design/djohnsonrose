// The Calculator's rules, shared by both builds. Each build only draws the keys
// and sends presses here, so a sum gives the same answer in v1 and v2, and the
// answer is the one Windows Calculator gives.

const MAX_DIGITS = 16;
const SIGNIFICANT = 15;

export const CALC_START = Object.freeze({
  display: '0',
  expression: '',
  currentOp: null,
  prevValue: null,
  // The next digit starts a new number rather than adding to the display.
  newNumber: true,
  // An operator has just been pressed and nothing typed since, so another
  // operator replaces it instead of working the sum out.
  pending: false,
  error: false,
});

export const CALC_ERRORS = Object.freeze({
  divideByZero: 'Cannot divide by zero',
  undefinedResult: 'Result is undefined',
  invalid: 'Invalid input',
  overflow: 'Overflow',
});

// The keypad, top row first. `label` is HTML; `name` is what a screen reader says.
export const CALC_BUTTONS = [
  { val: '%', label: '%', name: 'Percent', kind: 'fn' },
  { val: 'CE', label: 'CE', name: 'Clear entry', kind: 'fn' },
  { val: 'C', label: 'C', name: 'Clear', kind: 'fn' },
  { val: 'back', label: '⌫', name: 'Backspace', kind: 'fn' },
  { val: 'inv', label: '<sup>1</sup>&frasl;<sub>x</sub>', name: 'Reciprocal', kind: 'fn' },
  { val: 'sq', label: 'x²', name: 'Square', kind: 'fn' },
  { val: 'sqrt', label: '<sup>2</sup>√x', name: 'Square root', kind: 'fn' },
  { val: '/', label: '÷', name: 'Divide by', kind: 'op' },
  { val: '7', label: '7', name: 'Seven', kind: 'num' },
  { val: '8', label: '8', name: 'Eight', kind: 'num' },
  { val: '9', label: '9', name: 'Nine', kind: 'num' },
  { val: '*', label: '×', name: 'Multiply by', kind: 'op' },
  { val: '4', label: '4', name: 'Four', kind: 'num' },
  { val: '5', label: '5', name: 'Five', kind: 'num' },
  { val: '6', label: '6', name: 'Six', kind: 'num' },
  { val: '-', label: '−', name: 'Minus', kind: 'op' },
  { val: '1', label: '1', name: 'One', kind: 'num' },
  { val: '2', label: '2', name: 'Two', kind: 'num' },
  { val: '3', label: '3', name: 'Three', kind: 'num' },
  { val: '+', label: '+', name: 'Plus', kind: 'op' },
  { val: 'pm', label: '<sup>+</sup>&frasl;<sub>−</sub>', name: 'Positive negative', kind: 'sign' },
  { val: '0', label: '0', name: 'Zero', kind: 'num' },
  { val: '.', label: '.', name: 'Decimal separator', kind: 'sign' },
  { val: '=', label: '=', name: 'Equals', kind: 'equals' },
];

// Text fields and window controls keep their own keys.
export const CALC_IGNORE_KEYS_IN = '.os-titlebar, [data-snap-flyout], input, textarea, select, [contenteditable="true"]';

const OPERATORS = ['+', '-', '*', '/'];
const SYMBOLS = { '+': '+', '-': '−', '*': '×', '/': '÷' };
const isDigit = (key) => key.length === 1 && key >= '0' && key <= '9';

/** A number as the display shows it: 15 significant digits, no float noise or trailing zeros. */
export function formatCalc(value) {
  if (!Number.isFinite(value)) return null;
  const text = String(Number(value.toPrecision(SIGNIFICANT)));
  return text === '-0' ? '0' : text;
}

const fail = (message) => ({ ...CALC_START, display: message, error: true });

/** A result on the display, or the overflow message when it cannot be shown. */
function result(state, value, patch = {}) {
  const text = formatCalc(value);
  if (text === null) return fail(CALC_ERRORS.overflow);
  return { ...state, display: text, newNumber: true, pending: false, ...patch };
}

/** Works out the pending sum, or returns an error state. */
function evaluate(state) {
  if (state.currentOp === null || state.prevValue === null) return null;
  const a = state.prevValue;
  const b = parseFloat(state.display);
  if (state.currentOp === '/' && b === 0) {
    return { error: a === 0 ? CALC_ERRORS.undefinedResult : CALC_ERRORS.divideByZero };
  }
  if (state.currentOp === '+') return { value: a + b };
  if (state.currentOp === '-') return { value: a - b };
  if (state.currentOp === '*') return { value: a * b };
  return { value: a / b };
}

function typeDigit(state, key) {
  if (state.error) state = CALC_START;
  if (state.newNumber) {
    return { ...state, display: key === '.' ? '0.' : key, newNumber: false, pending: false };
  }
  if (key === '.' && state.display.includes('.')) return state;
  if (state.display.replace(/[-.]/g, '').length >= MAX_DIGITS) return state;
  if (state.display === '0' && key !== '.') return { ...state, display: key };
  if (state.display === '-0' && key !== '.') return { ...state, display: `-${key}` };
  return { ...state, display: state.display + key };
}

function pressOperator(state, key) {
  if (state.error) return state;
  if (state.currentOp !== null && state.pending) {
    return { ...state, currentOp: key, expression: `${formatCalc(state.prevValue)} ${SYMBOLS[key]}` };
  }
  let value = parseFloat(state.display);
  if (state.currentOp !== null) {
    const sum = evaluate(state);
    if (sum.error) return fail(sum.error);
    value = sum.value;
  }
  const text = formatCalc(value);
  if (text === null) return fail(CALC_ERRORS.overflow);
  return {
    ...state,
    display: text,
    prevValue: Number(text),
    currentOp: key,
    expression: `${text} ${SYMBOLS[key]}`,
    newNumber: true,
    pending: true,
  };
}

function pressEquals(state) {
  if (state.error) return CALC_START;
  if (state.currentOp === null) {
    const text = formatCalc(parseFloat(state.display)) ?? '0';
    return { ...state, display: text, newNumber: true, pending: false };
  }
  const sum = evaluate(state);
  if (sum.error) return fail(sum.error);
  return result(state, sum.value, { expression: '', currentOp: null, prevValue: null });
}

// Windows: with + or − pending, x% means x per cent of the first number;
// with × or ÷ it is a plain hundredth; with nothing pending it is 0.
function pressPercent(state) {
  if (state.error) return state;
  const current = parseFloat(state.display);
  let value = 0;
  if (state.currentOp === '+' || state.currentOp === '-') value = (state.prevValue * current) / 100;
  else if (state.currentOp === '*' || state.currentOp === '/') value = current / 100;
  return result(state, value);
}

function pressBack(state) {
  if (state.error) return CALC_START;
  if (state.newNumber) return state;
  const trimmed = state.display.slice(0, -1);
  if (trimmed === '' || trimmed === '-' || trimmed === '-0' || trimmed === '0') {
    return { ...state, display: '0' };
  }
  return { ...state, display: trimmed };
}

function pressSign(state) {
  if (state.error) return state;
  if (parseFloat(state.display) === 0 && !state.display.includes('.')) return state;
  const display = state.display.startsWith('-') ? state.display.slice(1) : `-${state.display}`;
  return { ...state, display, pending: false };
}

function pressUnary(state, key) {
  if (state.error) return state;
  const n = parseFloat(state.display);
  if (key === 'inv') return n === 0 ? fail(CALC_ERRORS.divideByZero) : result(state, 1 / n);
  if (key === 'sqrt') return n < 0 ? fail(CALC_ERRORS.invalid) : result(state, Math.sqrt(n));
  return result(state, n * n);
}

/** The calculator after one key. Never changes `state`. */
export function calcPress(state, key) {
  if (isDigit(key) || key === '.') return typeDigit(state, key);
  if (OPERATORS.includes(key)) return pressOperator(state, key);
  if (key === '=') return pressEquals(state);
  if (key === '%') return pressPercent(state);
  if (key === 'C') return CALC_START;
  if (key === 'CE') return state.error ? CALC_START : { ...state, display: '0', newNumber: true, pending: false };
  if (key === 'back') return pressBack(state);
  if (key === 'pm') return pressSign(state);
  if (key === 'inv' || key === 'sq' || key === 'sqrt') return pressUnary(state, key);
  return state;
}

/** The calculator key a keyboard key stands for, or null. */
export function calcKeyFor(eventKey) {
  if (isDigit(eventKey)) return eventKey;
  switch (eventKey) {
    case '.':
    case '+':
    case '-':
    case '*':
    case '/':
    case '%':
      return eventKey;
    case 'Enter':
    case '=':
      return '=';
    case 'Backspace':
      return 'back';
    case 'Delete':
      return 'CE';
    case 'Escape':
      return 'C';
    default:
      return null;
  }
}

/**
 * The key a keydown means for the calculator in `windowId`, or null when the
 * event belongs to something else: another window, a text field, a shortcut.
 */
export function calcKeyFromEvent(event, windowId, focusedWindowId) {
  if (windowId == null || windowId !== focusedWindowId) return null;
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  if (event.target?.closest?.(CALC_IGNORE_KEYS_IN)) return null;
  return calcKeyFor(event.key);
}
