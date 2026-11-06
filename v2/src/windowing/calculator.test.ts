import { describe, it, expect } from 'vitest'
import {
  CALC_BUTTONS,
  CALC_START,
  calcKeyFor,
  calcKeyFromEvent,
  calcPress,
  formatCalc,
  type CalcKey,
  type CalcState,
} from '../../../assets/js/windowing/calculator.js'

// The calculator both builds use. Each build only draws the keys and sends the
// presses here, so a sum gives the same answer in v1 and v2, the way Windows does.

const run = (keys: CalcKey[], from: CalcState = CALC_START): CalcState =>
  keys.reduce<CalcState>((s, k) => calcPress(s, k), from)

const show = (keys: CalcKey[]) => run(keys).display

describe('calculator digits', () => {
  it('first digit replaces the initial 0', () => {
    expect(show(['7'])).toBe('7')
  })

  it('multiple digits concatenate', () => {
    expect(show(['1', '2', '3'])).toBe('123')
  })

  it('. starts 0. on a new number', () => {
    expect(show(['.'])).toBe('0.')
  })

  it('refuses a second decimal point', () => {
    expect(show(['1', '.', '5', '.'])).toBe('1.5')
  })

  it('stops at 16 digits, as Windows does', () => {
    const keys = Array.from({ length: 20 }, () => '9' as CalcKey)
    expect(show(keys)).toBe('9'.repeat(16))
  })
})

describe('calculator arithmetic', () => {
  it('2 + 3 = 5', () => {
    expect(show(['2', '+', '3', '='])).toBe('5')
  })

  it('10 - 4 = 6', () => {
    expect(show(['1', '0', '-', '4', '='])).toBe('6')
  })

  it('6 × 7 = 42', () => {
    expect(show(['6', '*', '7', '='])).toBe('42')
  })

  it('20 ÷ 4 = 5', () => {
    expect(show(['2', '0', '/', '4', '='])).toBe('5')
  })

  it('chains left to right, with no precedence (2 + 3 × 4 = 20)', () => {
    expect(show(['2', '+', '3', '*', '4', '='])).toBe('20')
  })

  it('a second operator replaces the first: 5 + × 3 = 15', () => {
    const s = run(['5', '+', '*'])
    expect(s.expression).toBe('5 ×')
    expect(calcPress(s, '3').display).toBe('3')
    expect(show(['5', '+', '*', '3', '='])).toBe('15')
  })

  it('an operator after a unary result still uses it: 9 + 16 √ + gives 13', () => {
    expect(show(['9', '+', '1', '6', 'sqrt', '+'])).toBe('13')
  })

  it('= with no second number reuses the first, as Windows does (5 + = 10)', () => {
    expect(show(['5', '+', '='])).toBe('10')
  })

  it('= twice in a row keeps the result', () => {
    expect(show(['2', '+', '3', '=', '='])).toBe('5')
  })

  it('a digit after = starts a new number', () => {
    expect(show(['2', '+', '3', '=', '7'])).toBe('7')
  })
})

describe('calculator display', () => {
  it('0.1 + 0.2 shows 0.3, with no float noise', () => {
    expect(show(['.', '1', '+', '.', '2', '='])).toBe('0.3')
  })

  it('1 ÷ 3 keeps 15 significant digits and no trailing zeros', () => {
    expect(show(['1', '/', '3', '='])).toBe('0.333333333333333')
    expect(show(['1', '.', '5', '*', '2', '='])).toBe('3')
  })

  it('formatCalc strips noise and trailing zeros, and never shows -0', () => {
    expect(formatCalc(0.1 + 0.2)).toBe('0.3')
    expect(formatCalc(2.5)).toBe('2.5')
    expect(formatCalc(-0)).toBe('0')
    expect(formatCalc(1e21)).toBe('1e+21')
  })

  it('formatCalc rejects values that are not finite', () => {
    expect(formatCalc(Infinity)).toBeNull()
    expect(formatCalc(Number.NaN)).toBeNull()
  })

  it('uses × and ÷ in the expression', () => {
    expect(run(['3', '*']).expression).toBe('3 ×')
    expect(run(['8', '/']).expression).toBe('8 ÷')
    expect(run(['8', '-']).expression).toBe('8 −')
  })
})

describe('calculator percent, as Windows does it', () => {
  it('200 + 10 % = 220', () => {
    expect(show(['2', '0', '0', '+', '1', '0', '%'])).toBe('20')
    expect(show(['2', '0', '0', '+', '1', '0', '%', '='])).toBe('220')
  })

  it('200 - 10 % = 180', () => {
    expect(show(['2', '0', '0', '-', '1', '0', '%', '='])).toBe('180')
  })

  it('200 × 10 % = 20, as × and ÷ take a plain hundredth', () => {
    expect(show(['2', '0', '0', '*', '1', '0', '%', '='])).toBe('20')
    expect(show(['5', '0', '/', '5', '0', '%', '='])).toBe('100')
  })

  it('% with nothing pending gives 0', () => {
    expect(show(['5', '0', '%'])).toBe('0')
  })
})

describe('calculator unary keys', () => {
  it('± flips the sign and keeps typing', () => {
    expect(show(['5', 'pm'])).toBe('-5')
    expect(show(['5', 'pm', 'pm'])).toBe('5')
    expect(show(['5', 'pm', '3'])).toBe('-53')
  })

  it('± leaves 0 alone', () => {
    expect(show(['pm'])).toBe('0')
  })

  it('x² squares the display', () => {
    expect(show(['4', 'sq'])).toBe('16')
  })

  it('√ of 9 is 3', () => {
    expect(show(['9', 'sqrt'])).toBe('3')
  })

  it('√ of a negative number is invalid input', () => {
    const s = run(['9', 'pm', 'sqrt'])
    expect(s.display).toBe('Invalid input')
    expect(s.error).toBe(true)
  })

  it('1/x of 4 is 0.25', () => {
    expect(show(['4', 'inv'])).toBe('0.25')
  })

  it('1/x of 0 shows the Windows message, not Infinity', () => {
    const s = run(['0', 'inv'])
    expect(s.display).toBe('Cannot divide by zero')
    expect(s.error).toBe(true)
  })
})

describe('calculator errors', () => {
  it('5 ÷ 0 = shows the Windows message', () => {
    expect(show(['5', '/', '0', '='])).toBe('Cannot divide by zero')
  })

  it('0 ÷ 0 = says the result is undefined', () => {
    expect(show(['0', '/', '0', '='])).toBe('Result is undefined')
  })

  it('a result too big to show is an overflow, not Infinity', () => {
    const big = run(['9', 'sq', 'sq', 'sq', 'sq', 'sq', 'sq', 'sq', 'sq', 'sq', 'sq'])
    expect(big.display).toBe('Overflow')
    expect(big.error).toBe(true)
  })

  it('after an error, every operator and unary key leaves the message, never NaN', () => {
    const error = run(['5', '/', '0', '='])
    for (const key of ['+', '-', '*', '/', '%', 'pm', 'inv', 'sq', 'sqrt'] as CalcKey[]) {
      const after = calcPress(error, key)
      expect(after.display).toBe('Cannot divide by zero')
      expect(after.display).not.toMatch(/NaN/)
    }
  })

  it('5 ÷ 0 then + does not give NaN', () => {
    expect(show(['5', '/', '0', '+'])).toBe('Cannot divide by zero')
    expect(show(['5', '/', '0', '+', '2', '='])).toBe('2')
  })

  it('a digit after an error starts again', () => {
    const s = run(['0', 'inv', '7'])
    expect(s.display).toBe('7')
    expect(s.error).toBe(false)
    expect(run(['0', 'inv', '7', '+', '1', '=']).display).toBe('8')
  })

  it('Backspace, CE and = clear an error', () => {
    for (const key of ['back', 'CE', '=', 'C'] as CalcKey[]) {
      expect(run(['0', 'inv', key])).toEqual(CALC_START)
    }
  })
})

describe('calculator clearing', () => {
  it('C resets everything', () => {
    expect(run(['1', '2', '+', '3', 'C'])).toEqual(CALC_START)
  })

  it('CE clears only the current entry', () => {
    const s = run(['1', '2', '+', '5', 'CE'])
    expect(s.display).toBe('0')
    expect(s.currentOp).toBe('+')
    expect(s.prevValue).toBe(12)
    expect(calcPress(calcPress(s, '4'), '=').display).toBe('16')
  })

  it('Backspace trims the last character, down to 0', () => {
    expect(show(['1', '2', '3', 'back'])).toBe('12')
    expect(show(['1', 'back'])).toBe('0')
    expect(show(['1', '.', 'back'])).toBe('1')
  })

  it('-5 then Backspace leaves 0, not a bare minus sign', () => {
    expect(show(['5', 'pm', 'back'])).toBe('0')
    expect(show(['5', '.', 'pm', 'back', 'back'])).toBe('0')
  })

  it('Backspace leaves a result alone, as Windows does', () => {
    expect(show(['2', '+', '3', '=', 'back'])).toBe('5')
  })
})

describe('calcKeyFor', () => {
  it('maps digits and operators', () => {
    expect(calcKeyFor('5')).toBe('5')
    expect(calcKeyFor('+')).toBe('+')
    expect(calcKeyFor('*')).toBe('*')
    expect(calcKeyFor('%')).toBe('%')
  })

  it('maps Enter, =, Escape, Backspace and Delete', () => {
    expect(calcKeyFor('Enter')).toBe('=')
    expect(calcKeyFor('=')).toBe('=')
    expect(calcKeyFor('Escape')).toBe('C')
    expect(calcKeyFor('Backspace')).toBe('back')
    expect(calcKeyFor('Delete')).toBe('CE')
  })

  it('returns null for keys the calculator does not use', () => {
    expect(calcKeyFor('a')).toBeNull()
    expect(calcKeyFor('Shift')).toBeNull()
    expect(calcKeyFor('')).toBeNull()
  })
})

describe('calcKeyFromEvent', () => {
  const button = document.createElement('button')
  const input = document.createElement('input')
  const keydown = (key: string, target: Element = button, extra = {}) => ({
    key,
    target,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    ...extra,
  })

  it('takes keys while its own window has focus', () => {
    expect(calcKeyFromEvent(keydown('7'), 'w1', 'w1')).toBe('7')
    expect(calcKeyFromEvent(keydown('Enter'), 'w1', 'w1')).toBe('=')
  })

  it('ignores keys while another window, even another Calculator, has focus', () => {
    expect(calcKeyFromEvent(keydown('7'), 'w1', 'w2')).toBeNull()
    expect(calcKeyFromEvent(keydown('7'), 'w1', null)).toBeNull()
    expect(calcKeyFromEvent(keydown('7'), undefined, undefined)).toBeNull()
  })

  it('leaves text fields and shortcuts alone', () => {
    expect(calcKeyFromEvent(keydown('7', input), 'w1', 'w1')).toBeNull()
    expect(calcKeyFromEvent(keydown('c', button, { ctrlKey: true }), 'w1', 'w1')).toBeNull()
  })
})

describe('CALC_BUTTONS', () => {
  it('lays out 24 keys, every one with a name a screen reader can say', () => {
    expect(CALC_BUTTONS).toHaveLength(24)
    for (const button of CALC_BUTTONS) {
      expect(button.name.length).toBeGreaterThan(0)
      expect(button.label.length).toBeGreaterThan(0)
    }
  })

  it('has one key for every press the engine knows', () => {
    const vals = CALC_BUTTONS.map((b) => b.val).sort()
    expect(new Set(vals).size).toBe(24)
    expect(vals).toContain('=')
    expect(vals).toContain('back')
  })
})
