import { useCallback, useEffect, useState } from 'react'

const TOKEN_KEY = 'mailtracker-gmail-token'
const TOKEN_EXPIRY_KEY = 'mailtracker-gmail-expiry'
const SCOPES = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly'

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: { access_token?: string; expires_in?: number; error?: string }) => void
          }) => { requestAccessToken: (options?: { prompt?: string }) => void }
          revoke: (token: string, callback: () => void) => void
        }
      }
    }
  }
}

function loadScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(script)
  })
}

export function useGmail() {
  const [token, setToken] = useState<string | null>(() => {
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY)
    if (expiry && Date.now() < Number(expiry)) {
      return localStorage.getItem(TOKEN_KEY)
    }
    return null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

  const saveToken = useCallback((accessToken: string, expiresIn: number) => {
    const expiry = Date.now() + expiresIn * 1000 - 60_000
    localStorage.setItem(TOKEN_KEY, accessToken)
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiry))
    setToken(accessToken)
    setError(null)
  }, [])

  const signIn = useCallback(async () => {
    if (!clientId) {
      setError('Set VITE_GOOGLE_CLIENT_ID in .env to enable Gmail sending')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await loadScript()
      await new Promise<void>((resolve, reject) => {
        const client = window.google!.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: (response) => {
            if (response.error) {
              reject(new Error(response.error))
              return
            }
            if (response.access_token && response.expires_in) {
              saveToken(response.access_token, response.expires_in)
              resolve()
            } else {
              reject(new Error('No access token received'))
            }
          },
        })
        client.requestAccessToken({ prompt: token ? '' : 'consent' })
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect Gmail')
    } finally {
      setLoading(false)
    }
  }, [clientId, saveToken, token])

  const signOut = useCallback(() => {
    if (token && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(token, () => {})
    }
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(TOKEN_EXPIRY_KEY)
    setToken(null)
  }, [token])

  useEffect(() => {
    if (clientId) loadScript().catch(() => {})
  }, [clientId])

  return {
    token,
    isConnected: !!token,
    clientIdConfigured: !!clientId,
    loading,
    error,
    signIn,
    signOut,
  }
}
