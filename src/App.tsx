import { useMemo, useState } from 'react'
import { Layout, type Page } from './components/Layout'
import { useContacts } from './hooks/useContacts'
import { useGmail } from './hooks/useGmail'
import { useSettings } from './hooks/useSettings'
import { OutreachTreePage } from './pages/OutreachTreePage'
import { StagingPage } from './pages/StagingPage'

export default function App() {
  const { contacts, loading, error, addContact, updateContact, recordSend, deleteContact } =
    useContacts()
  const { yourName, loading: settingsLoading, updateYourName } = useSettings()
  const gmail = useGmail()
  const [page, setPage] = useState<Page>('outreach')

  const stats = useMemo(
    () => ({
      total: contacts.length,
      staged: contacts.filter((c) => c.status === 'staged').length,
      sent: contacts.filter((c) => c.status === 'sent').length,
    }),
    [contacts],
  )

  function handleEdit(id: string) {
    setPage('staging')
    sessionStorage.setItem('mailtracker-edit-id', id)
  }

  if (loading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md px-6">
          <p className="text-sm text-red-600 mb-2">{error}</p>
          <p className="text-xs text-slate-500">
            Make sure the API server is running: <code className="bg-slate-100 px-1 rounded">npm run dev</code>
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
      gmailConnected={gmail.isConnected}
      gmailLoading={gmail.loading}
      gmailError={gmail.error}
      onGmailConnect={gmail.signIn}
      onGmailDisconnect={gmail.signOut}
    >
      {page === 'outreach' ? (
        <OutreachTreePage
          contacts={contacts}
          token={gmail.token}
          onGmailRequired={gmail.signIn}
          onRecordSend={recordSend}
          onEdit={handleEdit}
          onDelete={deleteContact}
          yourName={yourName}
        />
      ) : (
        <StagingPage
          contacts={contacts}
          yourName={yourName}
          onYourNameChange={updateYourName}
          onAdd={addContact}
          onUpdate={updateContact}
          onRecordSend={recordSend}
          onDelete={deleteContact}
          token={gmail.token}
          onGmailRequired={gmail.signIn}
        />
      )}
    </Layout>
  )
}
