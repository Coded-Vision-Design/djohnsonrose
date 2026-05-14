import { describe, it, expect } from 'vitest'
import { press, initialState, keyboardToCalcKey, type CalcState } from './calc'

// Helpers
const run = (keys: Parameters<typeof press>[1][]): CalcState =>
  keys.reduce<CalcState>((s, k) => press(s, k), initialState)

describe('calculator state', () => {
  describe('digits', () => {
    it('first digit replaces the initial 0', () => {
      expect(run(['7']).display).toBe('7')
    })

    it('multiple digits concatenate', () => {
      expect(run(['1', '2', '3']).display).toBe('123')
    })

    it('. starts 0. when display is empty/new', () => {
      expect(run(['.']).display).toBe('0.')
    })

    it('refuses a second decimal point', () => {
      expect(run(['1', '.', '5', '.']).display).toBe('1.5')
    })
  })

  describe('basic arithmetic', () => {
    it('2 + 3 = 5', () => {
      expect(run(['2', '+', '3', '=']).display).toBe('5')
    })

    it('10 - 4 = 6', () => {
      expect(run(['1', '0', '-', '4', '=']).display).toBe('6')
    })

    it('6 × 7 = 42', () => {
      expect(run(['6', '*', '7', '=']).display).toBe('42')
    })

    it('20 ÷ 4 = 5', () => {
      expect(run(['2', '0', '/', '4', '=']).display).toBe('5')
    })

    it('chained ops evaluate left-to-right (2 + 3 × 4 = 20, not 14)', () => {
      // Standard calculator semantics — no operator precedence.
      expect(run(['2', '+', '3', '*', '4', '=']).display).toBe('20')
    })

    it('division by zero shows Error', () => {
      expect(run(['5', '/', '0', '=']).display).toBe('Error')
    })
  })

  describe('percent', () => {
    it('200 % 50 = 100  (200 / 100 * 50)', () => {
      expect(run(['2', '0', '0', '%', '5', '0', '=']).display).toBe('100')
    })
  })

  describe('unary operations', () => {
    it('pm flips the sign', () => {
      expect(run(['5', 'pm']).display).toBe('-5')
      expect(run(['5', 'pm', 'pm']).display).toBe('5')
    })

    it('sq squares the display', () => {
      expect(run(['4', 'sq']).display).toBe('16')
    })

    it('sqrt of 9 is 3', () => {
      expect(run(['9', 'sqrt']).display).toBe('3')
    })

    it('sqrt of a negative number errors', () => {
      const s = run(['9', 'pm', 'sqrt'])
      expect(s.display).toBe('Invalid input')
    })

    it('inv of 4 is 0.25', () => {
      expect(run(['4', 'inv']).display).toBe('0.25')
    })

    it('inv of 0 errors instead of returning Infinity', () => {
      expect(run(['0', 'inv']).display).toBe('Cannot divide by zero')
    })
  })

  describe('clearing', () => {
    it('C resets everything', () => {
      const s = run(['1', '2', '+', '3', 'C'])
      expect(s).toEqual(initialState)
    })

    it('CE clears only the current entry', () => {
      const s = run(['1', '2', '+', '5', 'CE'])
      expect(s.display).toBe('0')
      expect(s.currentOp).toBe('+')
      expect(s.prevValue).toBe(12)
    })

    it('back trims the last char; back at length 1 resets to 0', () => {
      expect(run(['1', '2', '3', 'back']).display).toBe('12')
      expect(run(['1', 'back']).display).toBe('0')
    })
  })

  describe('= after =', () => {
    it('= twice in a row keeps the result', () => {
      const after = run(['2', '+', '3', '='])
      const again = press(after, '=')
      expect(again.display).toBe('5')
    })
  })

  describe('expression label', () => {
    it('uses × and ÷ glyphs', () => {
      expect(run(['3', '*']).expression).toBe('3 ×')
      expect(run(['8', '/']).expression).toBe('8 ÷')
    })
  })

  describe('keyboardToCalcKey', () => {
    it('maps digits', () => {
      expect(keyboardToCalcKey('5')).toBe('5')
    })

    it('maps operators', () => {
      expect(keyboardToCalcKey('+')).toBe('+')
      expect(keyboardToCalcKey('*')).toBe('*')
    })

    it('maps Enter/Escape/Backspace', () => {
      expect(keyboardToCalcKey('Enter')).toBe('=')
      expect(keyboardToCalcKey('Escape')).toBe('C')
      expect(keyboardToCalcKey('Backspace')).toBe('back')
    })

    it('returns null for unrelated keys', () => {
      expect(keyboardToCalcKey('a')).toBeNull()
      expect(keyboardToCalcKey('Shift')).toBeNull()
    })
  })
})
