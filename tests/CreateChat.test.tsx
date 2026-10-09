import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App'
import { CreateChat } from '../src/components/createChat/CreateChat'

const mockApi = (accountExists: boolean) =>
  vi.fn(async (input: string | URL | Request) => {
    const url = String(input)

    if (url.includes('/checkAccount/')) {
      return {
        ok: true,
        json: async () =>
          accountExists
            ? { exist: true, chatId: 'chat-123' }
            : { exist: false },
      }
    }

    if (url.includes('/getContactInfo/')) {
      return {
        ok: true,
        text: async () => JSON.stringify({ name: 'Test contact' }),
      }
    }

    return { ok: true, text: async () => 'null' }
  })

beforeEach(() => {
  sessionStorage.setItem('messenger.idInstance', '123')
  sessionStorage.setItem('messenger.apiTokenInstance', 'token')
})

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  vi.unstubAllGlobals()
})

describe('CreateChat', () => {
  it('normalizes a Russian phone number and opens the returned chat', async () => {
    const onChatCreated = vi.fn()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ exist: true, chatId: 'chat-123' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(
      <CreateChat
        credentials={{ idInstance: '123', apiTokenInstance: 'token' }}
        onChatCreated={onChatCreated}
      />,
    )
    fireEvent.change(screen.getByLabelText('Номер телефона:'), {
      target: { value: '89991234567' },
    })
    expect(screen.getByLabelText('Номер телефона:')).toHaveProperty(
      'value',
      '+79991234567',
    )
    await user.click(screen.getByRole('button', { name: 'Создать чат' }))

    expect(fetchMock).toHaveBeenCalledWith(
      'https://3100.api.green-api.com/waInstance123/checkAccount/token',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ phoneNumber: '79991234567' }),
      }),
    )
    expect(onChatCreated).toHaveBeenCalledWith('chat-123')
  })

  it('does not make a request for an invalid phone number', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(
      <CreateChat
        credentials={{ idInstance: '123', apiTokenInstance: 'token' }}
        onChatCreated={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByLabelText('Номер телефона:'), {
      target: { value: '12345' },
    })
    await user.click(screen.getByRole('button', { name: 'Создать чат' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Введите корректный номер телефона в формате +7XXXXXXXXXX',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('renders the chat when the phone number has a MAX account', async () => {
    vi.stubGlobal('fetch', mockApi(true))
    const user = userEvent.setup()

    render(<App />)
    fireEvent.change(screen.getByLabelText('Номер телефона:'), {
      target: { value: '89991234567' },
    })
    await user.click(screen.getByRole('button', { name: 'Создать чат' }))

    expect(await screen.findByRole('region', { name: 'Чат' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Сообщение' })).toBeTruthy()
  })

  it('shows an error and does not render the chat when the phone number has no MAX account', async () => {
    vi.stubGlobal('fetch', mockApi(false))
    const user = userEvent.setup()

    render(<App />)
    fireEvent.change(screen.getByLabelText('Номер телефона:'), {
      target: { value: '89991234567' },
    })
    await user.click(screen.getByRole('button', { name: 'Создать чат' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'На этом номере нет аккаунта MAX.',
    )
    expect(screen.queryByRole('region', { name: 'Чат' })).toBeNull()
  })
})
