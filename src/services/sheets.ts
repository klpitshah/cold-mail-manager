const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'

interface SheetRow {
  id: string
  email: string
  name: string
  company: string
  subject: string
  body: string
  sendAt: string
  type: string
  threadId: string
  status: string
}

async function sheetsFetch(url: string, token: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Sheets API error: ${res.status} ${err}`)
  }
  return res.json()
}

export function extractSpreadsheetId(input: string): string | null {
  if (!input) return null
  const urlMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (urlMatch) return urlMatch[1]
  if (/^[a-zA-Z0-9-_]+$/.test(input.trim())) return input.trim()
  return null
}

export async function syncToSheet(
  token: string,
  spreadsheetId: string,
  rows: SheetRow[],
): Promise<{ updated: number; added: number }> {
  const sheetName = 'Scheduled'

  const existingData = await sheetsFetch(
    `${SHEETS_API}/${spreadsheetId}/values/${sheetName}!A:L`,
    token,
  ).catch(() => ({ values: [] }))

  const existingRows = (existingData.values || []) as string[][]
  const existingById = new Map<string, { rowIndex: number; data: string[] }>()
  
  existingRows.slice(1).forEach((row, idx) => {
    if (row[0]) {
      existingById.set(row[0], { rowIndex: idx + 2, data: row })
    }
  })

  const toUpdate: { range: string; values: string[][] }[] = []
  const toAdd: string[][] = []

  for (const row of rows) {
    const rowValues = [
      row.id,
      row.email,
      row.name,
      row.company,
      row.subject,
      row.body.replace(/\n/g, '\\n'),
      row.sendAt,
      row.type,
      row.threadId,
      row.status,
    ]

    const existing = existingById.get(row.id)
    if (existing) {
      const hasChanges = rowValues.some((val, idx) => val !== (existing.data[idx] ?? ''))
      if (hasChanges && existing.data[9] === 'pending') {
        toUpdate.push({
          range: `${sheetName}!A${existing.rowIndex}:J${existing.rowIndex}`,
          values: [rowValues],
        })
      }
    } else {
      toAdd.push([...rowValues, '', ''])
    }
  }

  if (toUpdate.length > 0) {
    await sheetsFetch(
      `${SHEETS_API}/${spreadsheetId}/values:batchUpdate`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          valueInputOption: 'RAW',
          data: toUpdate,
        }),
      },
    )
  }

  if (toAdd.length > 0) {
    await sheetsFetch(
      `${SHEETS_API}/${spreadsheetId}/values/${sheetName}!A:L:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({ values: toAdd }),
      },
    )
  }

  return { updated: toUpdate.length, added: toAdd.length }
}

export async function ensureSheetSetup(
  token: string,
  spreadsheetId: string,
): Promise<void> {
  const sheetName = 'Scheduled'

  const spreadsheet = await sheetsFetch(
    `${SHEETS_API}/${spreadsheetId}`,
    token,
  )

  const sheets = spreadsheet.sheets as { properties: { title: string; sheetId: number } }[]
  const scheduledSheet = sheets.find((s) => s.properties.title === sheetName)

  if (!scheduledSheet) {
    await sheetsFetch(
      `${SHEETS_API}/${spreadsheetId}:batchUpdate`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          requests: [{ addSheet: { properties: { title: sheetName } } }],
        }),
      },
    )

    const headers = [
      ['ID', 'Email', 'Name', 'Company', 'Subject', 'Body', 'Send At', 'Type', 'Thread ID', 'Status', 'Sent At', 'Error'],
    ]
    await sheetsFetch(
      `${SHEETS_API}/${spreadsheetId}/values/${sheetName}!A1:L1?valueInputOption=RAW`,
      token,
      {
        method: 'PUT',
        body: JSON.stringify({ values: headers }),
      },
    )
  } else {
    const headerData = await sheetsFetch(
      `${SHEETS_API}/${spreadsheetId}/values/${sheetName}!A1:L1`,
      token,
    ).catch(() => ({ values: [] }))

    if (!headerData.values || headerData.values.length === 0) {
      const headers = [
        ['ID', 'Email', 'Name', 'Company', 'Subject', 'Body', 'Send At', 'Type', 'Thread ID', 'Status', 'Sent At', 'Error'],
      ]
      await sheetsFetch(
        `${SHEETS_API}/${spreadsheetId}/values/${sheetName}!A1:L1?valueInputOption=RAW`,
        token,
        {
          method: 'PUT',
          body: JSON.stringify({ values: headers }),
        },
      )
    }
  }
}
