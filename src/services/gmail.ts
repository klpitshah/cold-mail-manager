import { parseEmailDraft } from '../utils/emailParse'

const GMAIL_SEND = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'
const GMAIL_MSG = 'https://gmail.googleapis.com/gmail/v1/users/me/messages'

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function buildMime(options: {
  to: string
  subject: string
  body: string
  inReplyTo?: string
  references?: string
}): string {
  const headers = [
    `To: ${options.to}`,
    `Subject: ${options.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
  ]
  if (options.inReplyTo) headers.push(`In-Reply-To: ${options.inReplyTo}`)
  if (options.references) headers.push(`References: ${options.references}`)
  return `${headers.join('\r\n')}\r\n\r\n${options.body}`
}

async function gmailFetch(path: string, token: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gmail API error: ${res.status} ${err}`)
  }
  return res.json()
}

export async function getMessageIdHeader(token: string, gmailMessageId: string): Promise<string | null> {
  const data = await gmailFetch(
    `${GMAIL_MSG}/${gmailMessageId}?format=metadata&metadataHeaders=Message-ID`,
    token,
  )
  const header = data.payload?.headers?.find(
    (h: { name: string; value: string }) => h.name.toLowerCase() === 'message-id',
  )
  return header?.value ?? null
}

export async function sendEmail(
  token: string,
  to: string,
  draft: string,
  options?: { threadId?: string; inReplyTo?: string; references?: string; subjectOverride?: string },
): Promise<{ messageId: string; threadId: string; subject: string }> {
  let { subject, body } = parseEmailDraft(draft)
  if (options?.subjectOverride) subject = options.subjectOverride
  if (options?.threadId && !subject.toLowerCase().startsWith('re:')) {
    subject = `Re: ${subject.replace(/^Re:\s*/i, '')}`
  }

  const mime = buildMime({
    to,
    subject,
    body,
    inReplyTo: options?.inReplyTo,
    references: options?.references,
  })

  const payload: { raw: string; threadId?: string } = { raw: toBase64Url(mime) }
  if (options?.threadId) payload.threadId = options.threadId

  const data = await gmailFetch(GMAIL_SEND, token, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return { messageId: data.id, threadId: data.threadId, subject }
}

export async function sendReply(
  token: string,
  to: string,
  draft: string,
  threadId: string,
  previousMessageId: string,
  lastSubject: string,
): Promise<{ messageId: string; threadId: string; subject: string }> {
  const rfcMessageId = await getMessageIdHeader(token, previousMessageId)
  const subject = lastSubject.startsWith('Re:') ? lastSubject : `Re: ${lastSubject}`
  const { body } = parseEmailDraft(draft)

  return sendEmail(token, to, `Subject: ${subject}\n\n${body}`, {
    threadId,
    inReplyTo: rfcMessageId ?? undefined,
    references: rfcMessageId ?? undefined,
    subjectOverride: subject,
  })
}
