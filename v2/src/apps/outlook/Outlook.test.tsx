import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Outlook from './Outlook'

const respond = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }))

describe('Outlook', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', respond(200, { success: true, message: 'Your message has been sent.' }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('asks for the visitor email before sending', async () => {
    render(<Outlook />)
    await userEvent.click(screen.getByRole('button', { name: /^.*Send$/ }))
    expect(screen.getByRole('status')).toHaveTextContent(/email/i)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('posts the reply address and leaves the recipient to the server', async () => {
    render(<Outlook />)
    await userEvent.type(screen.getByLabelText('From'), 'jo@example.com')
    await userEvent.click(screen.getByRole('button', { name: /^.*Send$/ }))

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    const form = vi.mocked(fetch).mock.calls[0][1]?.body as FormData
    expect(form.get('reply_to')).toBe('jo@example.com')
    expect(form.has('recipient')).toBe(false)
    expect(await screen.findByRole('status')).toHaveTextContent('Your message has been sent.')
  })

  it('shows the error the server returns', async () => {
    vi.stubGlobal('fetch', respond(429, { success: false, error: 'Too many messages.' }))
    render(<Outlook />)
    await userEvent.type(screen.getByLabelText('From'), 'jo@example.com')
    await userEvent.click(screen.getByRole('button', { name: /^.*Send$/ }))
    expect(await screen.findByText('Too many messages.')).toBeInTheDocument()
  })

  it('keeps the draft when sending fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    render(<Outlook />)
    await userEvent.type(screen.getByLabelText('From'), 'jo@example.com')
    const subject = screen.getByLabelText('Subject')
    await userEvent.clear(subject)
    await userEvent.type(subject, 'Keep me')
    await userEvent.click(screen.getByRole('button', { name: /^.*Send$/ }))

    expect(await screen.findByRole('status')).toHaveTextContent(/connection/i)
    expect(screen.getByLabelText('Subject')).toHaveValue('Keep me')
  })
})
