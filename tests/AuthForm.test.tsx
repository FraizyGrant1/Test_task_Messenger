import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthForm } from '../src/components/auth/AuthForm'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AuthForm', () => {
  it('authorizes with valid credentials when the instance is authorized', async () => {
    const onAuthorized = vi.fn()
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      text: async () => JSON.stringify({ stateInstance: 'authorized' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<AuthForm onAuthorized={onAuthorized} />)
    await user.type(screen.getByLabelText('idInstance'), '123456')
    await user.type(screen.getByLabelText('apiTokenInstance'), 'token')
    await user.click(screen.getByRole('button', { name: 'Проверить данные' }))

    expect(fetchMock).toHaveBeenCalledWith(
      'https://3100.api.green-api.com/waInstance123456/getStateInstance/token',
    )
    expect(onAuthorized).toHaveBeenCalledWith({
      idInstance: '123456',
      apiTokenInstance: 'token',
    })
  })

  it('shows an error and does not authorize when the instance is not authorized', async () => {
    const onAuthorized = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 200,
        text: async () => JSON.stringify({ stateInstance: 'notAuthorized' }),
      }),
    )
    const user = userEvent.setup()

    render(<AuthForm onAuthorized={onAuthorized} />)
    await user.type(screen.getByLabelText('idInstance'), '123456')
    await user.type(screen.getByLabelText('apiTokenInstance'), 'token')
    await user.click(screen.getByRole('button', { name: 'Проверить данные' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Инстанс не авторизван',
    )
    expect(onAuthorized).not.toHaveBeenCalled()
  })

  it('rejects non-numeric instance IDs before making a request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<AuthForm onAuthorized={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('idInstance'), {
      target: { value: '12x' },
    })
    await user.type(screen.getByLabelText('apiTokenInstance'), 'token')
    await user.click(screen.getByRole('button', { name: 'Проверить данные' }))

    expect(await screen.findByText('Допустимы только цифры')).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
