import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

const LEGACY_NAME_KEY = 'mailtracker-your-name'

export function useSettings() {
  const [yourName, setYourName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      try {
        const settings = await api.getSettings()
        if (settings.yourName) {
          setYourName(settings.yourName)
        } else {
          const legacy = localStorage.getItem(LEGACY_NAME_KEY)
          if (legacy) {
            setYourName(legacy)
            await api.updateSettings(legacy)
            localStorage.removeItem(LEGACY_NAME_KEY)
          }
        }
      } catch {
        const legacy = localStorage.getItem(LEGACY_NAME_KEY)
        if (legacy) setYourName(legacy)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const updateYourName = useCallback(async (name: string) => {
    setYourName(name)
    try {
      await api.updateSettings(name)
    } catch {
      // keep local state even if save fails
    }
  }, [])

  return { yourName, loading, updateYourName }
}
