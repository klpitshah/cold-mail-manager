import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { AppSettings, Contact, ScheduledSend, ScheduledSendType } from '../types'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { SendConfirmDialog } from '../components/SendConfirmDialog'
import { TemplateSelect } from '../components/TemplateSelect'
import type { EmailTemplateOption } from '../utils/templateRender'
import { executeContactSend } from '../utils/executeSend'
import { formatScheduledAt } from '../utils/scheduleDate'

type PendingAction =
  | { type: 'send'; contact: Contact; draft: string; sendType: 'initial' }
  | { type: 'delete'; contact: Contact }

interface StagingPageProps {
  contacts: Contact[]
  yourName: string
  mainTemplateOptions: EmailTemplateOption[]
  defaultInitialTemplateId: string
  renderMain: (
    templateId: string,
    ctx: { name: string; company: string; jobLink: string; yourName: string; role: string },
  ) => string
  onYourNameChange: (name: string) => void | Promise<void>
  onSettingsChange: (updates: Partial<AppSettings>) => void | Promise<void>
  onAdd: (data: {
    name: string
    company: string
    email: string
    role: string
    jobLink: string
    mailDraft: string
    initialTemplateId: string
    notes: string
  }) => Promise<Contact>
  onUpdate: (id: string, updates: Partial<Contact>) => Promise<void>
  onRecordSend: (
    id: string,
    result: { messageId: string; threadId: string; subject: string },
    isFollowUp: boolean,
  ) => Promise<void>
  onDelete: (id: string) => Promise<void>
  token: string | null
  onGmailRequired: () => void
  scheduleSend: (input: {
    contactId: string
    type: ScheduledSendType
    sendAt: string
    draft: string
  }) => Promise<unknown>
  getScheduledForContact: (contactId: string, type?: ScheduledSendType) => ScheduledSend | undefined
}

export function StagingPage({
  contacts,
  yourName,
  mainTemplateOptions,
  defaultInitialTemplateId,
  renderMain,
  onYourNameChange,
  onSettingsChange,
  onAdd,
  onUpdate,
  onRecordSend,
  onDelete,
  token,
  onGmailRequired,
  scheduleSend,
  getScheduledForContact,
}: StagingPageProps) {
  const [schedulingId, setSchedulingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [jobLink, setJobLink] = useState('')
  const [mailDraft, setMailDraft] = useState('')
  const [notes, setNotes] = useState('')
  const [initialTemplateId, setInitialTemplateId] = useState(defaultInitialTemplateId)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formSession, setFormSession] = useState(0)

  const staged = contacts.filter((c) => c.status === 'staged')
  const existingCompanies = useMemo(() => {
    const names = new Set(contacts.map((c) => c.company.trim()).filter(Boolean))
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [contacts])

  function loadForEdit(contact: Contact) {
    setEditingId(contact.id)
    setName(contact.name)
    setCompany(contact.company)
    setEmail(contact.email)
    setRole(contact.role)
    setJobLink(contact.jobLink)
    setMailDraft(contact.mailDraft)
    setInitialTemplateId(contact.initialTemplateId || defaultInitialTemplateId)
    setNotes(contact.notes)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    setInitialTemplateId((current) => (editingId ? current : defaultInitialTemplateId))
  }, [defaultInitialTemplateId, editingId])

  useEffect(() => {
    const editId = sessionStorage.getItem('mailtracker-edit-id')
    if (editId) {
      sessionStorage.removeItem('mailtracker-edit-id')
      const contact = contacts.find((c) => c.id === editId)
      if (contact) loadForEdit(contact)
    }
  }, [contacts])

  function regenerateDraft(templateId: string = initialTemplateId) {
    if (name && company) {
      setMailDraft(renderMain(templateId, { name, company, jobLink, yourName, role }))
    }
  }

  useEffect(() => {
    if (!editingId) {
      regenerateDraft()
    }
  }, [name, company, jobLink, yourName, role, editingId])

  function handleInitialTemplateChange(templateId: string) {
    setInitialTemplateId(templateId)
    onSettingsChange({ defaultInitialTemplate: templateId })
    regenerateDraft(templateId)
  }

  function resetForm() {
    setName('')
    setCompany('')
    setEmail('')
    setRole('')
    setJobLink('')
    setMailDraft('')
    setNotes('')
    setInitialTemplateId(defaultInitialTemplateId)
    setEditingId(null)
    setFormSession((n) => n + 1)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !company.trim()) return

    if (editingId) {
      await onUpdate(editingId, {
        name,
        company,
        email,
        role,
        jobLink,
        mailDraft,
        initialTemplateId,
        notes,
      })
      resetForm()
      return
    }

    await onAdd({ name, company, email, role, jobLink, mailDraft, initialTemplateId, notes })
    resetForm()
  }

  async function doSend(id: string) {
    if (!token) {
      onGmailRequired()
      return
    }
    const contact = contacts.find((c) => c.id === id)
    if (!contact?.email) {
      setError('Add an email before sending')
      return
    }
    setSendingId(id)
    setError(null)
    try {
      const result = await executeContactSend(token, contact, contact.mailDraft, 'initial')
      await onRecordSend(id, result, false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send')
    } finally {
      setSendingId(null)
    }
  }

  function requestSend(contact: Contact) {
    if (!contact.email) {
      setError('Add an email before sending')
      return
    }
    setPendingAction({ type: 'send', contact, draft: contact.mailDraft, sendType: 'initial' })
  }

  function requestDelete(contact: Contact) {
    setPendingAction({ type: 'delete', contact })
  }

  async function confirmSendNow() {
    if (!pendingAction || pendingAction.type !== 'send') return
    if (!token) {
      onGmailRequired()
      return
    }
    await doSend(pendingAction.contact.id)
    setPendingAction(null)
  }

  async function confirmSchedule(sendAt: string) {
    if (!pendingAction || pendingAction.type !== 'send') return
    setSchedulingId(pendingAction.contact.id)
    setError(null)
    try {
      await scheduleSend({
        contactId: pendingAction.contact.id,
        type: pendingAction.sendType,
        sendAt,
        draft: pendingAction.draft,
      })
      setPendingAction(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to schedule send')
    } finally {
      setSchedulingId(null)
    }
  }

  async function confirmPendingAction() {
    if (!pendingAction) return
    if (pendingAction.type === 'send') return
    setDeletingId(pendingAction.contact.id)
    try {
      await onDelete(pendingAction.contact.id)
      setPendingAction(null)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Capture form */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                {editingId ? 'Edit contact' : 'Stage a contact'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Capture from LinkedIn + Prospeo while you browse
              </p>
            </div>
            {editingId && (
              <button onClick={resetForm} className="text-xs text-slate-500 hover:text-slate-700">
                Cancel edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <CompanyField
                key={editingId ?? `create-${formSession}`}
                label="Company *"
                value={company}
                onChange={setCompany}
                companies={existingCompanies}
                placeholder="Google"
              />
              <Field label="Person's name *" value={name} onChange={setName} placeholder="Jane Smith" />
            </div>
            <Field label="Email (from Prospeo)" value={email} onChange={setEmail} placeholder="jane@google.com" type="email" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Role" value={role} onChange={setRole} placeholder="Recruiter" />
              <Field label="Job link" value={jobLink} onChange={setJobLink} placeholder="https://linkedin.com/jobs/..." />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Your name (signature)</label>
              <input
                type="text"
                value={yourName}
                onChange={(e) => onYourNameChange(e.target.value)}
                placeholder="Your Name"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
              />
            </div>

            <TemplateSelect
              label="Email template"
              value={initialTemplateId}
              options={mainTemplateOptions}
              onChange={handleInitialTemplateChange}
            />

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Email draft</label>
              <textarea
                value={mailDraft}
                onChange={(e) => setMailDraft(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition font-mono leading-relaxed resize-y"
                spellCheck
              />
            </div>

            <Field label="Notes" value={notes} onChange={setNotes} placeholder="How you found them..." />

            <button
              type="submit"
              className="w-full py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm"
            >
              {editingId ? 'Save changes' : 'Save to staging'}
            </button>
          </form>
        </div>
      </div>

      {/* Staged queue */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Staging queue</h2>
          <p className="text-xs text-slate-400 mt-0.5">{staged.length} ready to send</p>
        </div>

        {error && (
          <div className="mx-4 mt-3 px-3 py-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-auto p-4 space-y-2">
          {staged.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-slate-400">Nothing staged yet</p>
              <p className="text-xs text-slate-300 mt-1">Fill the form to capture your next outreach</p>
            </div>
          ) : (
            staged.map((contact) => {
              const scheduled = getScheduledForContact(contact.id, 'initial')
              return (
              <div
                key={contact.id}
                className="p-4 rounded-lg border border-slate-100 hover:border-slate-200 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{contact.name}</p>
                    <p className="text-xs text-slate-500">{contact.company}</p>
                    {contact.email && (
                      <p className="text-xs text-slate-400 mt-0.5">{contact.email}</p>
                    )}
                    {scheduled && (
                      <p className="text-xs text-violet-700 mt-1">
                        Scheduled · {formatScheduledAt(scheduled.sendAt)}
                      </p>
                    )}
                    {contact.jobLink && (
                      <a
                        href={contact.jobLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:text-blue-600 mt-0.5 inline-block"
                      >
                        View job ↗
                      </a>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
                    staged
                  </span>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => requestSend(contact)}
                    disabled={!contact.email || sendingId === contact.id || schedulingId === contact.id}
                    className="flex-1 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    {sendingId === contact.id
                      ? 'Sending…'
                      : schedulingId === contact.id
                        ? 'Scheduling…'
                        : scheduled
                          ? 'Send / reschedule'
                          : 'Send via Gmail'}
                  </button>
                  <button
                    onClick={() => loadForEdit(contact)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => requestDelete(contact)}
                    className="px-2 py-1.5 text-xs text-slate-400 hover:text-red-500 transition"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )})
          )}
        </div>
      </div>

      {pendingAction?.type === 'send' && (
        <SendConfirmDialog
          title="Send email?"
          message={`Send outreach email to ${pendingAction.contact.name} at ${pendingAction.contact.email}?`}
          sendLabel="Send email"
          scheduleLabel="Schedule email"
          variant="primary"
          loading={sendingId === pendingAction.contact.id || schedulingId === pendingAction.contact.id}
          onSendNow={confirmSendNow}
          onSchedule={confirmSchedule}
          onCancel={() => setPendingAction(null)}
        />
      )}

      {pendingAction?.type === 'delete' && (
        <ConfirmDialog
          title="Delete contact?"
          message={`Remove ${pendingAction.contact.name} at ${pendingAction.contact.company} from staging? This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          loading={deletingId === pendingAction.contact.id}
          onConfirm={confirmPendingAction}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  )
}

function CompanyField({
  label,
  value,
  onChange,
  companies,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  companies: string[]
  placeholder?: string
}) {
  const valueIsExisting = companies.includes(value)
  const [isNew, setIsNew] = useState(() => companies.length === 0 || (value !== '' && !valueIsExisting))

  useEffect(() => {
    if (companies.length === 0) {
      setIsNew(true)
      return
    }
    if (value && valueIsExisting) setIsNew(false)
  }, [companies.length, value, valueIsExisting])

  const inputClass =
    'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition'

  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      {companies.length > 0 && !isNew ? (
        <select
          value={valueIsExisting ? value : ''}
          onChange={(e) => {
            if (e.target.value === '__new__') {
              setIsNew(true)
              onChange('')
              return
            }
            onChange(e.target.value)
          }}
          className={inputClass}
        >
          <option value="">Select company…</option>
          {companies.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
          <option value="__new__">+ New company</option>
        </select>
      ) : (
        <div className="space-y-2">
          {companies.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setIsNew(false)
                onChange('')
              }}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              Pick existing company
            </button>
          )}
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={inputClass}
          />
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
      />
    </div>
  )
}
