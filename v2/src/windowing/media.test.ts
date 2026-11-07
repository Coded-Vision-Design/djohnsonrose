import { describe, it, expect } from 'vitest'
import {
  DEFAULT_ALBUM,
  DEFAULT_PDF,
  DEFAULT_VIDEO,
  canShowPdf,
  formatMediaTime,
  mediaName,
  pdfOpenLabel,
  photoAlbum,
  progressPercent,
  seekTime,
} from '../../../assets/js/windowing/media.js'
import { filesystem } from '../data/filesystem'

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

describe('photoAlbum', () => {
  const fs = filesystem as unknown as Record<string, { name: string; type: string; url?: string }[]>

  it('shows both the portfolio screenshots and the competition photos', () => {
    const { path, images, index } = photoAlbum(fs)
    expect(path).toBe(DEFAULT_ALBUM)
    expect(index).toBe(0)
    const urls = images.map((image) => image.url ?? '')
    expect(urls.some((url) => url.includes('/portfolio/'))).toBe(true)
    expect(urls.some((url) => url.includes('AJP%20Grand%20Slam') || url.includes('AJP Grand Slam'))).toBe(true)
  })

  it('opens on the picture asked for, by name or by address', () => {
    const byName = photoAlbum(fs, { imageName: 'IBJJF World Championships 2022.webp' })
    expect(byName.images[byName.index].name).toBe('IBJJF World Championships 2022.webp')
    const url = fs[DEFAULT_ALBUM].find((entry) => entry.name === 'cpttours.webp')!.url!
    const byUrl = photoAlbum(fs, { imageUrl: url })
    expect(byUrl.images[byUrl.index].name).toBe('cpttours.webp')
  })

  it('brings the folder of a picture kept elsewhere', () => {
    const folder = 'C:\\Users\\DeVante\\Projects\\Freelance\\Earth Echo\\Pictures'
    const album = photoAlbum(fs, { imageUrl: fs[folder][1].url })
    expect(album.path).toBe(folder)
    expect(album.index).toBe(1)
  })

  it('still shows a picture that is in no folder', () => {
    const album = photoAlbum(fs, { imageUrl: '/somewhere/else.webp' })
    expect(album.images).toEqual([{ name: 'else.webp', type: 'image', url: '/somewhere/else.webp' }])
  })

  it('falls back to Pictures for a folder that does not exist', () => {
    expect(photoAlbum(fs, { folderPath: 'C:\\Nowhere' }).path).toBe(DEFAULT_ALBUM)
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
