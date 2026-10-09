import { useEffect, useState } from 'react'
import { API_URL } from '../../../constants'
import type { AuthCredentials } from '../../../types/auth'

export type ContactInfo = {
  avatar: string | null
  name: string
}

type ContactInfoResponse = {
  avatar?: string | null
  name?: string | null
}

export function useContactInfo(chatId: string, credentials: AuthCredentials) {
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    const loadContactInfo = async () => {
      setIsLoading(true)
      setContactInfo(null)
      setError('')

      const { idInstance, apiTokenInstance } = credentials
      const url = `${API_URL}/waInstance${encodeURIComponent(idInstance)}/getContactInfo/${encodeURIComponent(apiTokenInstance)}`

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId }),
          signal: controller.signal,
        })
        const body = await response.text()

        if (!response.ok) {
          throw new Error(body || `Ошибка запроса (HTTP ${response.status})`)
        }

        let result: ContactInfoResponse
        try {
          result = JSON.parse(body) as ContactInfoResponse
        } catch {
          throw new Error('Сервер вернул некорректные данные контакта')
        }

        setContactInfo({
          avatar: result.avatar || null,
          name: result.name || chatId,
        })
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(
            error instanceof Error
              ? error.message
              : 'Не удалось загрузить данные контакта',
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadContactInfo()
    return () => controller.abort()
  }, [chatId, credentials])

  return { contactInfo, error, isLoading }
}
