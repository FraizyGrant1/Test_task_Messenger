import { useEffect, useRef, useState } from 'react'
import { API_URL } from '../../../constants'
import type { AuthCredentials } from '../../../types/auth'

export type ChatMessage = {
  id: number
  text: string
  direction: 'incoming' | 'outgoing'
}

type Notification = {
  receiptId: string | number
  body?: {
    senderData?: {
      chatId?: string
    }
    messageData?: {
      textMessageData?: {
        textMessage?: string
      }
    }
  }
}

export function useChatMessages(
  chatId: string,
  credentials: AuthCredentials,
  isReady: boolean,
) {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [notificationError, setNotificationError] = useState('')
  const nextMessageId = useRef(0)
  const handledReceiptIds = useRef(new Set<string>())

  useEffect(() => {
    if (!isReady) {
      return
    }

    const controller = new AbortController()
    let isPolling = false
    let isFastPolling = true
    const { idInstance, apiTokenInstance } = credentials
    const baseUrl = `${API_URL}/waInstance${encodeURIComponent(idInstance)}`
    const receivePath = `${baseUrl}/receiveNotification/${encodeURIComponent(apiTokenInstance)}`
    let receiveUrl = `${receivePath}?receiveTimeout=1`
    let intervalId: number

    const pollNotifications = async () => {
      if (isPolling) {
        return
      }

      isPolling = true
      try {
        const response = await fetch(receiveUrl, {
          method: 'GET',
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error(`Не удалось получить уведомления (HTTP ${response.status})`)
        }

        const body = await response.text()
        if (!body.trim()) {
          switchToSlowPolling()
          return
        }

        let notification: Notification | null
        try {
          notification = JSON.parse(body) as Notification | null
        } catch {
          throw new Error('Сервер вернул некорректное уведомление')
        }
        if (notification === null) {
          switchToSlowPolling()
          return
        }

        const receiptId = String(notification.receiptId)
        if (!handledReceiptIds.current.has(receiptId)) {
          handledReceiptIds.current.add(receiptId)
          const senderChatId = notification.body?.senderData?.chatId
          const textMessage = notification.body?.messageData?.textMessageData?.textMessage

          if (senderChatId === chatId && textMessage !== undefined) {
            setMessages((current) => [
              ...current,
              {
                id: nextMessageId.current++,
                text: textMessage,
                direction: 'incoming',
              },
            ])
          }
        }

        const deleteUrl = `${baseUrl}/deleteNotification/${encodeURIComponent(apiTokenInstance)}/${encodeURIComponent(receiptId)}`
        const deleteResponse = await fetch(deleteUrl, {
          method: 'DELETE',
          signal: controller.signal,
        })
        if (!deleteResponse.ok) {
          throw new Error(`Не удалось удалить уведомление (HTTP ${deleteResponse.status})`)
        }
        setNotificationError('')
      } catch (error) {
        if (!controller.signal.aborted) {
          setNotificationError(
            error instanceof Error
              ? error.message
              : 'Не удалось получить уведомления',
          )
        }
      } finally {
        isPolling = false
      }
    }

    const switchToSlowPolling = () => {
      if (!isFastPolling) {
        return
      }

      isFastPolling = false
      receiveUrl = receivePath
      window.clearInterval(intervalId)
      intervalId = window.setInterval(() => {
        void pollNotifications()
      }, 5000)
    }

    intervalId = window.setInterval(() => {
      void pollNotifications()
    }, 1000)
    void pollNotifications()

    return () => {
      window.clearInterval(intervalId)
      controller.abort()
    }
  }, [chatId, credentials, isReady])

  const sendMessage = async () => {
    const messageText = message
    if (!messageText.trim() || isSending) {
      return
    }

    setIsSending(true)
    setSendError('')
    const { idInstance, apiTokenInstance } = credentials
    const url = `${API_URL}/waInstance${encodeURIComponent(idInstance)}/sendMessage/${encodeURIComponent(apiTokenInstance)}`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ chatId, message: messageText }),
      })
      const body = await response.text()
      if (!response.ok) {
        setSendError(body || `Не удалось отправить сообщение (HTTP ${response.status})`)
        return
      }

      setMessages((current) => [
        ...current,
        {
          id: nextMessageId.current++,
          text: messageText,
          direction: 'outgoing',
        },
      ])
      setMessage('')
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : 'Не удалось отправить сообщение',
      )
    } finally {
      setIsSending(false)
    }
  }

  return {
    message,
    setMessage,
    messages,
    isSending,
    sendError,
    notificationError,
    sendMessage,
  }
}
