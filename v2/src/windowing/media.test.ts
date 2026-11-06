import { describe, it, expect } from 'vitest'
import {
  DEFAULT_PDF,
  DEFAULT_VIDEO,
  canShowPdf,
  formatMediaTime,
  mediaName,
  pdfOpenLabel,
  progressPercent,
  seekTime,
} from '../../../assets/js/windowing/media.js'

// What Video and PDF Reader share between the builds.

describe('formatMediaTime', () => {
  it('shows minutes and seconds', () => {
    expect(formatMediaTime(0)).toBe('0:00')
    expect(formatMediaTime(65.9)).toBe('1:05')
    expect(formatMediaTime(600)).toBe('10:00')
  })

  it('shows 0:00 for a length the browser does not know yet', () => {
    expect(formatMediaTime(Number.NaN)).toBe('0:00')
    expect(formatMediaTime(Infinity)).toBe('0:00')
    expect(formatMediaTime(-3)).toBe('0:00')
  })
})

describe('seeking', () => {
  const bar = { left: 100, width: 200 }

  it('turns a point on the bar into a time', () => {
    expect(seekTime(200, bar, 60)).toBe(30)
    expect(seekTime(100, bar, 60)).toBe(0)
  })

  it('keeps the time inside the clip when the pointer leaves the bar', () => {
    expect(seekTime(50, bar, 60)).toBe(0)
    expect(seekTime(400, bar, 60)).toBe(60)
  })

  it('stays at 0 before the length is known, or for a bar with no width', () => {
    expect(seekTime(200, bar, Number.NaN)).toBe(0)
    expect(seekTime(200, { left: 0, width: 0 }, 60)).toBe(0)
  })

  it('works out how far through the clip it is', () => {
    expect(progressPercent(15, 60)).toBe(25)
    expect(progressPercent(15, 0)).toBe(0)
    expect(progressPercent(15, Number.NaN)).toBe(0)
  })
})

describe('PDF Reader', () => {
  it('can show a PDF unless the browser says it has no viewer', () => {
    expect(canShowPdf({ pdfViewerEnabled: true })).toBe(true)
    expect(canShowPdf({})).toBe(true)
    expect(canShowPdf({ pdfViewerEnabled: false })).toBe(false)
    expect(canShowPdf(undefined)).toBe(true)
  })

  it('names the button after what it opens', () => {
    expect(pdfOpenLabel('/data/cv.pdf')).toBe('Open the CV')
    expect(pdfOpenLabel('data/report.pdf')).toBe('Open the PDF')
  })

  it('names a file from its address, with the defaults for each app', () => {
    expect(mediaName('/data/south-africa-25.mp4')).toBe('south-africa-25.mp4')
    expect(mediaName('')).toBe('')
    expect(DEFAULT_PDF).toBe('data/cv.pdf')
    expect(DEFAULT_VIDEO).toBe('data/south-africa-25.mp4')
  })
})
