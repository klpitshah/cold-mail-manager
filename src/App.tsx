import { useEffect, useMemo, useState } from 'react'
import { Layout, type Page } from './components/Layout'
import { ScheduledSendsBanner } from './components/ScheduledSendsBanner'
import { useContacts } from './hooks/useContacts'
import { useGmail } from './hooks/useGmail'
import { useScheduledSends } from './hooks/useScheduledSends'
import { useSettings } from './hooks/useSettings'
import { useTemplates } from './hooks/useTemplates'
import { OutreachTreePage } from './pages/OutreachTreePage'
import { StagingPage } from './pages/StagingPage'

export default function App() {
  const { contacts, loading, error, addContact, updateContact, recordSend, deleteContact } =
    useContacts()
  const {
    catalog,
    mainOptions,
    followUpOptions,
    defaultMainTemplateId,
    defaultFollowUpTemplateId,
    loading: templatesLoading,
    error: templatesError,
    renderMain,
    renderFollowUp,
    resolveMainId,
    resolveFollowUpId,
  } = useTemplates()
  const {
    yourName,
    defaultInitialTemplate,
    defaultFollowUpTemplate,
    loading: settingsLoading,
    updateYourName,
    updateSettings,
  } = useSettings(
    templatesLoading
      ? undefined
      : { main: defaultMainTemplateId, followUp: defaultFollowUpTemplateId },
  )
  const {
    scheduledSends,
    pendingScheduled,
    scheduleSend,
    cancelScheduledSend,
    getScheduledForContact,
    processDueSends,
  } = useScheduledSends()
  const gmail = useGmail()
  const [page, setPage] = useState<Page>('outreach')

  const effectiveMainTemplateId = useMemo(
    () => resolveMainId(defaultInitialTemplate || defaultMainTemplateId),
    [defaultInitialTemplate, defaultMainTemplateId, resolveMainId],
  )
  const effectiveFollowUpTemplateId = useMemo(
    () => resolveFollowUpId(defaultFollowUpTemplate || defaultFollowUpTemplateId),
    [defaultFollowUpTemplate, defaultFollowUpTemplateId, resolveFollowUpId],
  )

  const stats = useMemo(
    () => ({
      total: contacts.length,
      staged: contacts.filter((c) => c.status === 'staged').length,
      sent: contacts.filter((c) => c.status === 'sent').length,
    }),
    [contacts],
  )

  useEffect(() => {
    if (!gmail.token) return

    const run = () => {
      processDueSends(gmail.token!, contacts, recordSend).catch(() => {})
    }

    run()
    const interval = window.setInterval(run, 15000)
    return () => window.clearInterval(interval)
  }, [gmail.token, contacts, processDueSends, recordSend])

  function handleEdit(id: string) {
    setPage('staging')
    sessionStorage.setItem('mailtracker-edit-id', id)
  }

  if (loading || settingsLoading || templatesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    )
  }

  if (error || templatesError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md px-6">
          <p className="text-sm text-red-600 mb-2">{error ?? templatesError}</p>
          <p className="text-xs text-slate-500">
            Make sure the API server is running: <code className="bg-slate-100 px-1 rounded">npm run dev</code>
          </p>
        </div>
      </div>
    )
  }

  if (!catalog.defaults.main || !catalog.defaults.followUp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md px-6">
          <p className="text-sm text-red-600 mb-2">No email templates found</p>
          <p className="text-xs text-slate-500">
            Add JSON files to <code className="bg-slate-100 px-1 rounded">template/main</code> and{' '}
            <code className="bg-slate-100 px-1 rounded">template/follow-up</code>
          </p>
        </div>
      </div>
    )
  }

  return (
    <Layout
      page={page}
      onNavigate={setPage}
      stats={stats}
      scheduledCount={pendingScheduled.length}
      gmailConnected={gmail.isConnected}
      gmailLoading={gmail.loading}
      gmailError={gmail.error}
      onGmailConnect={gmail.signIn}
      onGmailDisconnect={gmail.signOut}
    >
      <ScheduledSendsBanner
        scheduledSends={scheduledSends}
        contacts={contacts}
        onCancel={cancelScheduledSend}
      />

      {page === 'outreach' ? (
        <OutreachTreePage
          contacts={contacts}
          token={gmail.token}
          onGmailRequired={gmail.signIn}
          onRecordSend={recordSend}
          onEdit={handleEdit}
          onDelete={deleteContact}
          yourName={yourName}
          followUpOptions={followUpOptions}
          defaultFollowUpTemplateId={effectiveFollowUpTemplateId}
          renderFollowUp={renderFollowUp}
          onFollowUpTemplateChange={(templateId) =>
            updateSettings({ defaultFollowUpTemplate: templateId })
          }
          scheduleSend={scheduleSend}
          getScheduledForContact={getScheduledForContact}
        />
      ) : (
        <StagingPage
          contacts={contacts}
          yourName={yourName}
          mainTemplateOptions={mainOptions}
          defaultInitialTemplateId={effectiveMainTemplateId}
          renderMain={renderMain}
          onYourNameChange={updateYourName}
          onSettingsChange={updateSettings}
          onAdd={addContact}
          onUpdate={updateContact}
          onRecordSend={recordSend}
          onDelete={deleteContact}
          token={gmail.token}
          onGmailRequired={gmail.signIn}
          scheduleSend={scheduleSend}
          getScheduledForContact={getScheduledForContact}
        />
      )}
    </Layout>
  )
}
