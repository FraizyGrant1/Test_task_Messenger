import { useEffect, useState } from 'react'
import { AuthForm } from './components/auth/AuthForm'
import { Chat } from './components/chat/Chat'
import { ClearCredentials } from './components/clearCredentials/ClearCredentials'
import { CreateChat } from './components/createChat/CreateChat'
import type { AuthCredentials } from './types/auth'

const SESSION_KEYS = {
  idInstance: 'messenger.idInstance',
  apiTokenInstance: 'messenger.apiTokenInstance',
  chatId: 'messenger.chatId',
}

function App() {
  const [credentials, setCredentials] = useState<AuthCredentials | null>(() => {
    const idInstance = sessionStorage.getItem(SESSION_KEYS.idInstance)
    const apiTokenInstance = sessionStorage.getItem(SESSION_KEYS.apiTokenInstance)

    return idInstance && apiTokenInstance
      ? { idInstance, apiTokenInstance }
      : null
  })
  const [chatId, setChatId] = useState<string | null>(
    () => sessionStorage.getItem(SESSION_KEYS.chatId),
  )
  const hasSessionData = credentials !== null || chatId !== null

  const clearSession = () => {
    sessionStorage.removeItem(SESSION_KEYS.idInstance)
    sessionStorage.removeItem(SESSION_KEYS.apiTokenInstance)
    sessionStorage.removeItem(SESSION_KEYS.chatId)
    setCredentials(null)
    setChatId(null)
  }

  useEffect(() => {
    if (credentials) {
      sessionStorage.setItem(SESSION_KEYS.idInstance, credentials.idInstance)
      sessionStorage.setItem(
        SESSION_KEYS.apiTokenInstance,
        credentials.apiTokenInstance,
      )
    } else {
      sessionStorage.removeItem(SESSION_KEYS.idInstance)
      sessionStorage.removeItem(SESSION_KEYS.apiTokenInstance)
    }
  }, [credentials])

  useEffect(() => {
    if (chatId) {
      sessionStorage.setItem(SESSION_KEYS.chatId, chatId)
    } else {
      sessionStorage.removeItem(SESSION_KEYS.chatId)
    }
  }, [chatId])

  return (
    <main>
      <h1 className={hasSessionData ? 'app-title app-title--with-logout' : 'app-title'}>
        Отправка текстовых сообщений в MAX
      </h1>
      {credentials ? (
        chatId ? (
          <Chat
            chatId={chatId}
            credentials={credentials}
          />
        ) : (
          <CreateChat credentials={credentials} onChatCreated={setChatId} />
        )
      ) : (
          <AuthForm onAuthorized={setCredentials} />
      )}
      {hasSessionData && <ClearCredentials onClear={clearSession} />}
    </main>
  );
}

export default App;
