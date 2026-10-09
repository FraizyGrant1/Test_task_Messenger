import { useState, type SubmitEvent } from 'react'
import { API_URL } from '../../constants'
import type { AuthCredentials } from '../../types/auth'
import './CreateChat.scss'

type CheckAccountResponse =
  | { exist: true; chatId: string }
  | { exist: false }

type CreateChatProps = {
  credentials: AuthCredentials
  onChatCreated: (chatId: string) => void
}

const normalizePhoneNumber = (value: string) => {
  const digits = value.replace(/\D/g, '')

  if (!digits) {
    return ''
  }

  const nationalNumber =
    digits[0] === '7' || digits[0] === '8' ? digits.slice(1) : digits

  return `+7${nationalNumber.slice(0, 10)}`
}

export function CreateChat({ credentials, onChatCreated }: CreateChatProps) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [touched, setTouched] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requestError, setRequestError] = useState('')
  const isValid = /^\+7\d{10}$/.test(phoneNumber)
  const errorMessage = touched
    ? !phoneNumber
      ? 'Введите номер телефона'
      : !isValid
        ? 'Введите корректный номер телефона в формате +7XXXXXXXXXX'
        : ''
    : ''

  const onSubmit = async () => {
    setTouched(true)
    setRequestError('')

    if (!isValid) {
      return
    }

    setIsSubmitting(true)
    const { idInstance, apiTokenInstance } = credentials
    const url = `${API_URL}/waInstance${encodeURIComponent(idInstance)}/checkAccount/${encodeURIComponent(apiTokenInstance)}`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneNumber.replace(/^\+/, '') }),
      })
      if (!response.ok) {
        setRequestError('Не удалось проверить номер. Попробуйте снова.')
        return
      }

      const result: CheckAccountResponse = await response.json()

      if (!result.exist) {
        setRequestError('На этом номере нет аккаунта MAX.')
        return
      }

      onChatCreated(result.chatId)
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : 'Не удалось выполнить запрос',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFormSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    void onSubmit()
  }

  return (
    <form className="create-chat-form" onSubmit={handleFormSubmit}>
      <p>Кому напишем?</p>
      <div className="create-chat-form__field">
        <label htmlFor="phoneNumber">Номер телефона:</label>
        <input
          id="phoneNumber"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={phoneNumber}
          maxLength={12}
          required
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={errorMessage ? 'phoneNumber-error' : undefined}
          onChange={(event) =>
            setPhoneNumber(normalizePhoneNumber(event.currentTarget.value))
          }
          onBlur={() => setTouched(true)}
        />
      </div>
      {errorMessage && (
        <span className="create-chat-form__error" id="phoneNumber-error" role="alert">
          {errorMessage}
        </span>
      )}
      <button
        className="create-chat-form__submit"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Проверка телефона…' : 'Создать чат'}
      </button>
      {requestError && (
        <p className="create-chat-form__error" role="alert">
          {requestError}
        </p>
      )}
    </form>
  )
}
