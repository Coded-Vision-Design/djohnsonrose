import { describe, it, expect } from 'vitest'
import {
  ACTIVITY_SHOWN,
  activityFromApi,
  activityFromResponse,
  activityNeedsLoading,
  fullDate,
  stepTestimonial,
  testimonialByline,
  testimonialsFromApi,
  testimonialsFromResponse,
  timeAgo,
} from '../../../assets/js/windowing/widgets.js'

// What both builds' Widgets show for api/activity.php and api/testimonials.php.

const NOW = Date.parse('2026-11-07T12:00:00Z')
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString()
const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const reply = (status: number, body: string) =>
  new Response(body, { status, headers: { 'Content-Type': 'application/json' } })

describe('timeAgo', () => {
  it('says how long ago, in words', () => {
    expect(timeAgo(ago(20), NOW)).toBe('just now')
    expect(timeAgo(ago(MINUTE), NOW)).toBe('1 minute ago')
    expect(timeAgo(ago(5 * MINUTE + 30), NOW)).toBe('5 minutes ago')
    expect(timeAgo(ago(HOUR), NOW)).toBe('1 hour ago')
    expect(timeAgo(ago(23 * HOUR), NOW)).toBe('23 hours ago')
    expect(timeAgo(ago(30 * HOUR), NOW)).toBe('yesterday')
    expect(timeAgo(ago(3 * DAY), NOW)).toBe('3 days ago')
    expect(timeAgo(ago(7 * DAY), NOW)).toBe('1 week ago')
    expect(timeAgo(ago(20 * DAY), NOW)).toBe('2 weeks ago')
    expect(timeAgo(ago(45 * DAY), NOW)).toBe('1 month ago')
    expect(timeAgo(ago(100 * DAY), NOW)).toBe('3 months ago')
    expect(timeAgo(ago(400 * DAY), NOW)).toBe('1 year ago')
    expect(timeAgo(ago(800 * DAY), NOW)).toBe('2 years ago')
  })

  it('reads the moment each unit changes the same way', () => {
    expect(timeAgo(ago(59), NOW)).toBe('just now')
    expect(timeAgo(ago(HOUR - 1), NOW)).toBe('59 minutes ago')
    expect(timeAgo(ago(DAY - 1), NOW)).toBe('23 hours ago')
    expect(timeAgo(ago(2 * DAY - 1), NOW)).toBe('yesterday')
    expect(timeAgo(ago(7 * DAY - 1), NOW)).toBe('6 days ago')
    expect(timeAgo(ago(30 * DAY - 1), NOW)).toBe('4 weeks ago')
    expect(timeAgo(ago(365 * DAY - 1), NOW)).toBe('12 months ago')
  })

  it('treats a time a little ahead, from a clock that is out, as just now', () => {
    expect(timeAgo(ago(-90), NOW)).toBe('just now')
  })

  it('says nothing for something that is not a date', () => {
    expect(timeAgo('yesterday', NOW)).toBe('')
    expect(timeAgo(undefined, NOW)).toBe('')
  })
})

describe('fullDate', () => {
  it('writes the day first, the British way, in London', () => {
    expect(fullDate('2026-11-06T18:00:00Z')).toBe('6 November 2026')
    // Half past midnight in summer time is already the next day in London.
    expect(fullDate('2026-06-30T23:30:00Z')).toBe('1 July 2026')
  })

  it('says nothing for something that is not a date', () => {
    expect(fullDate('soon')).toBe('')
  })
})

describe('activityFromApi', () => {
  const commit = (n: number) => ({ message: `fix: change ${n}`, sha: `abcdef${n}`, date: ago(n * HOUR) })

  it('keeps the message, short SHA and date of each commit', () => {
    expect(activityFromApi({ commits: [commit(1)] })).toEqual([{ message: 'fix: change 1', sha: 'abcdef1', date: ago(HOUR) }])
  })

  it(`shows ${ACTIVITY_SHOWN} at most`, () => {
    const commits = [1, 2, 3, 4, 5, 6, 7].map(commit)
    expect(activityFromApi({ commits })?.map((c) => c.sha)).toEqual(['abcdef1', 'abcdef2', 'abcdef3', 'abcdef4', 'abcdef5'])
  })

  it('passes on nothing else, such as an author or a link', () => {
    const [shown] = activityFromApi({ commits: [{ ...commit(1), author: 'someone', url: 'https://example.com' }] })!
    expect(Object.keys(shown)).toEqual(['message', 'sha', 'date'])
  })

  it('shortens a full SHA to seven', () => {
    expect(activityFromApi({ commits: [{ ...commit(1), sha: 'a'.repeat(40) }] })?.[0].sha).toBe('aaaaaaa')
  })

  it('leaves out broken entries and shows the rest', () => {
    const commits = [{ message: '', sha: 'abcdef1', date: ago(1) }, { ...commit(2), sha: 'zz' }, { ...commit(3), date: 'soon' }, null, commit(4)]
    expect(activityFromApi({ commits })?.map((c) => c.message)).toEqual(['fix: change 4'])
  })

  it('has nothing to show for an answer with no commits', () => {
    expect(activityFromApi({ commits: [] })).toBeNull()
    expect(activityFromApi({ error: 'Recent changes unavailable' })).toBeNull()
    expect(activityFromApi(null)).toBeNull()
    expect(activityFromApi({ commits: 'x' })).toBeNull()
  })
})

describe('activityNeedsLoading', () => {
  it('loads on the first opening, and again after a failure', () => {
    expect(activityNeedsLoading('idle')).toBe(true)
    expect(activityNeedsLoading('error')).toBe(true)
  })

  it('does not load again once loaded, or while loading', () => {
    expect(activityNeedsLoading('ready')).toBe(false)
    expect(activityNeedsLoading('loading')).toBe(false)
  })

  it('loads for a state it does not know', () => {
    expect(activityNeedsLoading(undefined)).toBe(true)
  })
})

describe('activityFromResponse', () => {
  it('reads the commits from a good reply', async () => {
    const res = reply(200, JSON.stringify({ commits: [{ message: 'fix: a', sha: 'abcdef1', date: ago(HOUR) }] }))
    await expect(activityFromResponse(res)).resolves.toHaveLength(1)
  })

  // Chrome keeps a request open until its body is read, as with the weather.
  it('reads the body of an error reply before failing', async () => {
    const res = reply(503, JSON.stringify({ error: 'Recent changes unavailable' }))
    await expect(activityFromResponse(res)).rejects.toThrow('HTTP 503')
    expect(res.bodyUsed).toBe(true)
  })

  it('fails on a good reply with nothing to show, or that is not JSON', async () => {
    await expect(activityFromResponse(reply(200, JSON.stringify({ commits: [] })))).rejects.toThrow()
    await expect(activityFromResponse(reply(200, '<html>'))).rejects.toThrow()
  })
})

describe('testimonialsFromApi', () => {
  const full = { quote: 'Q', name: 'N', role: 'R', company: 'C', link: 'https://example.com/n' }

  it('keeps every field of a complete testimonial', () => {
    expect(testimonialsFromApi({ testimonials: [full] })).toEqual([full])
  })

  it('reads a missing role and company as blank, and leaves out a missing link', () => {
    expect(testimonialsFromApi({ testimonials: [{ quote: 'Q', name: 'N' }] })).toEqual([{ quote: 'Q', name: 'N', role: '', company: '' }])
  })

  it('drops a link that is not https, and keeps the words', () => {
    for (const link of ['javascript:alert(1)', 'http://example.com', '//example.com', 'nonsense']) {
      expect(testimonialsFromApi({ testimonials: [{ ...full, link }] })).toEqual([{ quote: 'Q', name: 'N', role: 'R', company: 'C' }])
    }
  })

  it('leaves out one with no quote or name', () => {
    expect(testimonialsFromApi({ testimonials: [{ name: 'N' }, { quote: 'Q' }, { quote: 'Q', name: 5 }, 'x'] })).toEqual([])
  })

  it('has none in an empty or broken answer', () => {
    expect(testimonialsFromApi({ testimonials: [] })).toEqual([])
    expect(testimonialsFromApi(null)).toEqual([])
    expect(testimonialsFromApi({ testimonials: {} })).toEqual([])
  })
})

describe('testimonialsFromResponse', () => {
  it('reads the testimonials from a good reply', async () => {
    const res = reply(200, JSON.stringify({ testimonials: [{ quote: 'Q', name: 'N' }] }))
    await expect(testimonialsFromResponse(res)).resolves.toHaveLength(1)
  })

  it('has none for an error reply, which hides the widget, and reads its body', async () => {
    const res = reply(500, '{}')
    await expect(testimonialsFromResponse(res)).resolves.toEqual([])
    expect(res.bodyUsed).toBe(true)
    await expect(testimonialsFromResponse(reply(200, 'not json'))).resolves.toEqual([])
  })
})

describe('stepTestimonial', () => {
  it('moves to the next and previous', () => {
    expect(stepTestimonial(0, 1, 3)).toBe(1)
    expect(stepTestimonial(2, -1, 3)).toBe(1)
  })

  it('goes round at either end', () => {
    expect(stepTestimonial(2, 1, 3)).toBe(0)
    expect(stepTestimonial(0, -1, 3)).toBe(2)
  })

  it('stays put with one or none, and mends an index out of range', () => {
    expect(stepTestimonial(0, 1, 1)).toBe(0)
    expect(stepTestimonial(4, 1, 0)).toBe(0)
    expect(stepTestimonial(7, 0, 3)).toBe(1)
    expect(stepTestimonial(Number.NaN, 1, 3)).toBe(1)
  })
})

describe('testimonialByline', () => {
  it('joins the role and company', () => {
    expect(testimonialByline({ role: 'Head of IT', company: 'Example Ltd' })).toBe('Head of IT, Example Ltd')
  })

  it('leaves out what is blank', () => {
    expect(testimonialByline({ role: '', company: 'Example Ltd' })).toBe('Example Ltd')
    expect(testimonialByline({ role: 'Head of IT', company: '' })).toBe('Head of IT')
    expect(testimonialByline({ role: '', company: '' })).toBe('')
  })
})
