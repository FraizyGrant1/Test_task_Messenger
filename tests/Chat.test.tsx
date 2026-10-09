import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Chat } from '../src/components/chat/Chat'

const credentials = { idInstance: '123', apiTokenInstance: 'token' }

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
})

describe('Chat', () => {
  it('displays the contact name and avatar returned by getContactInfo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        if (String(input).includes('/getContactInfo/')) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                name: 'Test Example',
                avatar: 'https://example.com/avatar.png',
              }),
          }
        }

        return { ok: true, text: async () => 'null' }
      }),
    )

    render(<Chat chatId="123" credentials={credentials} />)

    const chat = await screen.findByRole('region', { name: 'Чат' })
    const header = chat.querySelector('.chat-header')

    expect(
      screen.getByText('Test Example', { selector: '.chat-header strong' }),
    ).toBeTruthy()
    expect(
      header?.querySelector('.chat-avatar__image')?.getAttribute('src'),
    ).toBe('https://example.com/avatar.png')
  })

  it('sends the submitted message to the chat API', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input).includes('/getContactInfo/')) {
        return {
          ok: true,
          text: async () => JSON.stringify({ name: 'Test Example' }),
        }
      }

      if (String(input).includes('/sendMessage/')) {
        return { ok: true, text: async () => '{}' }
      }

      return { ok: true, text: async () => 'null' }
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<Chat chatId="123" credentials={credentials} />)

    const messageInput = await screen.findByRole('textbox', { name: 'Сообщение' })
    await user.type(messageInput, 'Привет!')
    await user.click(screen.getByRole('button', { name: 'Отправить сообщение' }))

    expect(fetchMock).toHaveBeenCalledWith(
      'https://3100.api.green-api.com/waInstance123/sendMessage/token',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ chatId: '123', message: 'Привет!' }),
      }),
    )
    expect(await screen.findByText('Привет!')).toBeTruthy()
  })

  it('displays incoming messages and deletes their notifications', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)

      if (url.includes('/getContactInfo/')) {
        return {
          ok: true,
          text: async () => JSON.stringify({ name: 'Test Example' }),
        }
      }

      if (url.includes('/receiveNotification/')) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              receiptId: 456,
              body: {
                senderData: { chatId: '123' },
                messageData: {
                  textMessageData: { textMessage: 'Входящее сообщение' },
                },
              },
            }),
        }
      }

      return { ok: true, text: async () => '' }
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<Chat chatId="123" credentials={credentials} />)

    expect(await screen.findByText('Входящее сообщение')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledWith(
      'https://3100.api.green-api.com/waInstance123/deleteNotification/token/456',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it.each([400, 403, 500])(
    'shows the HTTP %i send error and retains the message',
    async (status) => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)

      if (url.includes('/getContactInfo/')) {
        return {
          ok: true,
          text: async () => JSON.stringify({ name: 'Test Example' }),
        }
      }

      if (url.includes('/sendMessage/')) {
        return { ok: false, status, text: async () => '' }
      }

      return { ok: true, text: async () => 'null' }
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<Chat chatId="123" credentials={credentials} />)

    const messageInput = await screen.findByRole('textbox', { name: 'Сообщение' })
    await user.type(messageInput, 'Неотправленное сообщение')
    await user.click(screen.getByRole('button', { name: 'Отправить сообщение' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      `Не удалось отправить сообщение (HTTP ${status})`,
    )
    expect(messageInput).toHaveProperty('value', 'Неотправленное сообщение')
    expect(screen.queryByRole('article')).toBeNull()
    },
  )
})
