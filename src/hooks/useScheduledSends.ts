import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import type { Contact, ScheduledSend, ScheduledSendType } from '../types'
import { executeContactSend } from '../utils/executeSend'

export function useScheduledSends() {
  const [scheduledSends, setScheduledSends] = useState<ScheduledSend[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const data = await api.getScheduledSends()
    setScheduledSends(data)
    return data
  }, [])

  useEffect(() => {
    refresh()
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [refresh])

  const pendingScheduled = useMemo(
    () =>
      scheduledSends
        .filter((item) => item.status === 'pending')
        .sort((a, b) => new Date(a.sendAt).getTime() - new Date(b.sendAt).getTime()),
    [scheduledSends],
  )

  const scheduleSend = useCallback(
    async (input: {
      contactId: string
      type: ScheduledSendType
      sendAt: string
      draft: string
    }) => {
      const created = await api.createScheduledSend(input)
      setScheduledSends((prev) => [
        ...prev.filter(
          (item) =>
            !(
              item.contactId === created.contactId &&
              item.type === created.type &&
              item.status === 'pending'
            ),
        ),
        created,
      ])
      return created
    },
    [],
  )

  const cancelScheduledSend = useCallback(async (id: string) => {
    await api.deleteScheduledSend(id)
    setScheduledSends((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const updateScheduledSend = useCallback(
    async (id: string, updates: { draft?: string; sendAt?: string }) => {
      const updated = await api.updateScheduledSend(id, updates)
      setScheduledSends((prev) =>
        prev.map((item) => (item.id === id ? updated : item)),
      )
      return updated
    },
    [],
  )

  const getScheduledForContact = useCallback(
    (contactId: string, type?: ScheduledSendType) =>
      pendingScheduled.find(
        (item) => item.contactId === contactId && (type ? item.type === type : true),
      ),
    [pendingScheduled],
  )

  const processDueSends = useCallback(
    async (
      token: string,
      contacts: Contact[],
      recordSend: (
        id: string,
        result: { messageId: string; threadId: string; subject: string },
        isFollowUp: boolean,
      ) => Promise<void>,
    ) => {
      const due = pendingScheduled.filter((item) => new Date(item.sendAt).getTime() <= Date.now())
      if (due.length === 0) return

      for (const item of due) {
        const contact = contacts.find((entry) => entry.id === item.contactId)
        if (!contact?.email) {
          setScheduledSends((prev) =>
            prev.map((entry) =>
              entry.id === item.id
                ? { ...entry, status: 'failed', error: 'Contact has no email address' }
                : entry,
            ),
          )
          continue
        }

        try {
          const result = await executeContactSend(token, contact, item.draft, item.type)
          await recordSend(contact.id, result, item.type === 'follow-up')
          await api.deleteScheduledSend(item.id)
          setScheduledSends((prev) => prev.filter((entry) => entry.id !== item.id))
        } catch (error) {
          setScheduledSends((prev) =>
            prev.map((entry) =>
              entry.id === item.id
                ? {
                    ...entry,
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Failed to send',
                  }
                : entry,
            ),
          )
        }
      }
    },
    [pendingScheduled],
  )

  return {
    scheduledSends,
    pendingScheduled,
    loading,
    refresh,
    scheduleSend,
    cancelScheduledSend,
    updateScheduledSend,
    getScheduledForContact,
    processDueSends,
  }
}
