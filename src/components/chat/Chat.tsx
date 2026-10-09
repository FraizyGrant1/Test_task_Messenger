import { useEffect, useRef, type SubmitEvent } from 'react'
import sendIcon from '../../assets/icon_send.svg'
import type { AuthCredentials } from '../../types/auth'
import { useChatMessages } from './hooks/useChatMessages'
import { useContactInfo } from './hooks/useContactInfo'
import './Chat.scss'

type ChatProps = {
  chatId: string
  credentials: AuthCredentials
}

export function Chat({ chatId, credentials }: ChatProps) {
  const { contactInfo, error: contactInfoError, isLoading } = useContactInfo(
    chatId,
    credentials,
  )
  const {
    message,
    setMessage,
    messages,
    isSending,
    sendError,
    notificationError,
    sendMessage,
  } = useChatMessages(chatId, credentials, contactInfo !== null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const avatarLabel = (contactInfo?.name || chatId).slice(0, 1).toUpperCase()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleFormSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    void sendMessage()
  }

  if (isLoading) {
    return (
      <section className="chat-page chat-loading" aria-label="Загрузка чата">
        <div className="chat-loading__spinner" role="status" aria-label="Загрузка" />
      </section>
    )
  }

  const avatar = contactInfo?.avatar ? (
    <img src={contactInfo.avatar} alt="" className="chat-avatar__image" />
  ) : (
    avatarLabel
  )

  return (
    <section className="chat-page" aria-label="Чат">
      <div className="chat-conversation">
        <header className="chat-header">
          <div className="chat-avatar" aria-hidden="true">{avatar}</div>
          <div className="chat-header__copy">
            <strong>{contactInfo?.name || chatId}</strong>
            <span className={contactInfoError ? 'chat-header__error' : undefined}>
              {contactInfoError || 'Чат'}
            </span>
          </div>
        </header>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-empty-state">
              <div className="chat-empty-state__avatar chat-avatar" aria-hidden="true">
                {avatar}
              </div>
              <strong>Чат создан</strong>
              <span>{contactInfo?.name || chatId}</span>
            </div>
          ) : (
            <div className="chat-message-list" aria-live="polite">
              {messages.map((sentMessage) => (
                <div
                  className={`chat-message-row chat-message-row--${sentMessage.direction}`}
                  key={sentMessage.id}
                >
                  <article className={`chat-message chat-message--${sentMessage.direction}`}>
                    <p>{sentMessage.text}</p>
                  </article>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <form className="chat-composer" onSubmit={handleFormSubmit}>
          <textarea
            aria-label="Сообщение"
            placeholder="Сообщение"
            value={message}
            maxLength={4000}
            rows={1}
            onChange={(event) => setMessage(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
          />
          {message.trim() && (
            <button
              className="chat-send-button"
              type="submit"
              aria-label="Отправить сообщение"
              title="Отправить сообщение"
              disabled={isSending}
            >
              {isSending ? (
                <span className="chat-send-button__loading" aria-hidden="true">
                  …
                </span>
              ) : (
                <img
                  className="chat-send-button__icon"
                  src={sendIcon}
                  alt=""
                />
              )}
            </button>
          )}
          {sendError && (
            <p className="chat-composer__error" role="alert">{sendError}</p>
          )}
          {notificationError && (
            <p className="chat-composer__error" role="alert">
              {notificationError}
            </p>
          )}
        </form>
      </div>
    </section>
  )
}
