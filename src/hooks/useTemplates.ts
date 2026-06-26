import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import type { EmailTemplateOption, TemplateCatalog } from '../utils/templateRender'
import {
  renderFollowUpEmail,
  renderMainEmail,
  resolveFollowUpTemplateId,
  resolveMainTemplateId,
  toTemplateOptions,
} from '../utils/templateRender'

const emptyCatalog: TemplateCatalog = {
  main: {},
  followUp: {},
  defaults: { main: '', followUp: '' },
}

export function useTemplates() {
  const [catalog, setCatalog] = useState<TemplateCatalog>(emptyCatalog)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .getTemplates()
      .then((data) => {
        setCatalog(data.catalog)
        setError(null)
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load templates')
      })
      .finally(() => setLoading(false))
  }, [])

  const mainOptions = useMemo(() => toTemplateOptions(catalog.main), [catalog.main])
  const followUpOptions = useMemo(() => toTemplateOptions(catalog.followUp), [catalog.followUp])

  const renderMain = useCallback(
    (
      templateId: string,
      ctx: { name: string; company: string; jobLink: string; yourName: string; role: string },
    ) => renderMainEmail(catalog, templateId, ctx),
    [catalog],
  )

  const renderFollowUp = useCallback(
    (
      templateId: string,
      ctx: { name: string; company: string; yourName: string; followUpCount: number },
    ) => renderFollowUpEmail(catalog, templateId, ctx),
    [catalog],
  )

  const resolveMainId = useCallback(
    (id: string | undefined) => resolveMainTemplateId(catalog, id),
    [catalog],
  )

  const resolveFollowUpId = useCallback(
    (id: string | undefined) => resolveFollowUpTemplateId(catalog, id),
    [catalog],
  )

  return {
    catalog,
    mainOptions,
    followUpOptions,
    defaultMainTemplateId: catalog.defaults.main,
    defaultFollowUpTemplateId: catalog.defaults.followUp,
    loading,
    error,
    renderMain,
    renderFollowUp,
    resolveMainId,
    resolveFollowUpId,
  }
}

export type { EmailTemplateOption, TemplateCatalog }
