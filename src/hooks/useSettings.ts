import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import type { AppSettings } from '../types'

const LEGACY_NAME_KEY = 'mailtracker-your-name'

const defaultSettings: AppSettings = {
  yourName: '',
  defaultInitialTemplate: '',
  defaultFollowUpTemplate: '',
}

export function useSettings(defaultTemplateIds?: {
  main: string
  followUp: string
}) {
  const [settings, setSettings] = useState<AppSettings>({
    ...defaultSettings,
    defaultInitialTemplate: defaultTemplateIds?.main ?? '',
    defaultFollowUpTemplate: defaultTemplateIds?.followUp ?? '',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      try {
        const saved = await api.getSettings()
        if (saved.yourName) {
          setSettings(saved)
        } else {
          const legacy = localStorage.getItem(LEGACY_NAME_KEY)
          if (legacy) {
            const next = { ...saved, yourName: legacy }
            setSettings(next)
            await api.updateSettings({ yourName: legacy })
            localStorage.removeItem(LEGACY_NAME_KEY)
          } else {
            setSettings(saved)
          }
        }
      } catch {
        const legacy = localStorage.getItem(LEGACY_NAME_KEY)
        if (legacy) setSettings((prev) => ({ ...prev, yourName: legacy }))
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!defaultTemplateIds) return
    setSettings((prev) => ({
      ...prev,
      defaultInitialTemplate: prev.defaultInitialTemplate || defaultTemplateIds.main,
      defaultFollowUpTemplate: prev.defaultFollowUpTemplate || defaultTemplateIds.followUp,
    }))
  }, [defaultTemplateIds?.main, defaultTemplateIds?.followUp])

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates }
      api.updateSettings(updates).catch(() => {})
      return next
    })
  }, [])

  const updateYourName = useCallback(
    (name: string) => updateSettings({ yourName: name }),
    [updateSettings],
  )

  return {
    ...settings,
    loading,
    updateSettings,
    updateYourName,
  }
}
