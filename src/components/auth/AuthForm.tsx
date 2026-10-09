import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { API_URL } from '../../constants'
import type { AuthCredentials } from '../../types/auth'
import './AuthForm.scss'

type AuthFormProps = {
  onAuthorized: (credentials: AuthCredentials) => void
}

export function AuthForm({ onAuthorized }: AuthFormProps) {
  const [requestError, setRequestError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthCredentials>()

  const onSubmit = async (credentials: AuthCredentials) => {
    setRequestError('')

    const { idInstance, apiTokenInstance } = credentials
    const url = `${API_URL}/waInstance${encodeURIComponent(idInstance)}/getStateInstance/${encodeURIComponent(apiTokenInstance)}`

    try {
      const response = await fetch(url)
      const body = await response.text()
      let parsedBody: unknown

      try {
        parsedBody = JSON.parse(body)
      } catch {
        parsedBody = undefined
      }

      if (
        typeof parsedBody === 'object' &&
        parsedBody !== null &&
        'stateInstance' in parsedBody
      ) {
        if (parsedBody.stateInstance === 'notAuthorized') {
          setRequestError('Инстанс не авторизван')
          return
        }

        if (parsedBody.stateInstance === 'authorized') {
          onAuthorized(credentials)
          return
        }
      }

      setRequestError(
        body || `Пустой ответ от сервера (HTTP ${response.status})`,
      )
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : 'Не удалось выполнить запрос',
      )
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <p>Введите данные своего инстанса:</p>
      <div className="auth-form__field">
        <label htmlFor="idInstance">idInstance</label>
        <input
          id="idInstance"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-invalid={Boolean(errors.idInstance)}
          aria-describedby={errors.idInstance ? 'idInstance-error' : undefined}
          {...register('idInstance', {
            required: 'Введите idInstance',
            pattern: {
              value: /^\d+$/,
              message: 'Допустимы только цифры',
            },
          })}
        />
        {errors.idInstance && (
          <span className="auth-form__error" id="idInstance-error" role="alert">
            {errors.idInstance.message}
          </span>
        )}
      </div>

      <div className="auth-form__field">
        <label htmlFor="apiTokenInstance">apiTokenInstance</label>
        <input
          id="apiTokenInstance"
          type="text"
          autoComplete="off"
          aria-invalid={Boolean(errors.apiTokenInstance)}
          aria-describedby={
            errors.apiTokenInstance ? 'apiTokenInstance-error' : undefined
          }
          {...register('apiTokenInstance', {
            required: 'Введите apiTokenInstance',
            validate: (value) =>
              value.trim().length > 0 || 'Поле не должно быть пустым',
          })}
        />
        {errors.apiTokenInstance && (
          <span
            className="auth-form__error"
            id="apiTokenInstance-error"
            role="alert"
          >
            {errors.apiTokenInstance.message}
          </span>
        )}
      </div>

      <button className="auth-form__submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Проверка…' : 'Проверить данные'}
      </button>

      {requestError && (
        <p className="auth-form__request-error" role="alert">
          {requestError}
        </p>
      )}
    </form>
  )
}
