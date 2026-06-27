# Google Apps Script - Scheduled Email Sender

This script runs on Google's servers and sends your scheduled emails even when your computer is off.

## Quick Setup (5 minutes)

### Step 1: Create Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Name it something like "Cold Mail Scheduler"

### Step 2: Add the Script

1. In your new sheet, go to **Extensions → Apps Script**
2. Delete any existing code in the editor
3. Copy the entire contents of `Code.gs` from this folder
4. Paste it into the Apps Script editor
5. Click **Save** (Ctrl+S / Cmd+S)

### Step 3: Set Up the Sheet

1. In the Apps Script editor, select `setupSheet` from the function dropdown (top toolbar)
2. Click **Run**
3. You'll be prompted to authorize the script - click through and allow access
4. Go back to your Google Sheet - you should see a "Scheduled" sheet with headers

### Step 4: Create Automatic Trigger

1. Back in Apps Script, select `createTrigger` from the function dropdown
2. Click **Run**
3. This sets up automatic checking every 5 minutes

**That's it!** The script will now check for due emails every 5 minutes, 24/7.

---

## How to Use

### Adding Scheduled Sends

From your Cold Mail Manager app:

1. Click **"Export to Sheets"** in the Scheduled Sends banner
2. This copies the data in the right format
3. Go to your Google Sheet → "Scheduled" tab
4. Paste starting from row 2 (below headers)

Or manually add rows with these columns:

| Column | Description | Example |
|--------|-------------|---------|
| A - ID | Unique identifier | `abc-123` |
| B - Email | Recipient email | `john@company.com` |
| C - Name | Recipient name | `John Smith` |
| D - Company | Company name | `Acme Inc` |
| E - Subject | Email subject | `Quick question about...` |
| F - Body | Email body text | `Hi John, ...` |
| G - Send At | When to send (ISO format) | `2024-01-15T09:00:00Z` |
| H - Type | `initial` or `follow-up` | `initial` |
| I - Thread ID | Gmail thread ID (for follow-ups) | `thread123` |
| J - Status | Set to `pending` | `pending` |
| K - Sent At | (auto-filled when sent) | |
| L - Error | (auto-filled if failed) | |

### Checking Status

- Open your Google Sheet to see the status of each send
- **Sent Log** sheet shows all successfully sent emails
- Run `checkQuota()` in Apps Script to see remaining daily quota

### Manual Operations

In the Apps Script editor, you can run:

| Function | What it does |
|----------|--------------|
| `testSend()` | Manually process due emails now |
| `checkQuota()` | Check remaining daily email quota |
| `removeDuplicates()` | Remove duplicate rows (by ID) |
| `clearProcessedRows()` | Remove sent/failed rows from sheet |
| `deleteTriggers()` | Stop automatic checking |
| `createTrigger()` | Restart automatic checking |

---

## Gmail Sending Limits

- **Personal Gmail**: ~500 emails/day
- **Google Workspace**: ~1,500 emails/day

The script respects these limits automatically.

---

## Follow-up Emails (Threading)

For follow-up emails to appear in the same thread:

1. Set **Type** to `follow-up`
2. Set **Thread ID** to the Gmail thread ID from your app

The app exports this automatically when you use "Export to Sheets".

---

## Troubleshooting

### "Authorization required"
- Run any function and click through the authorization prompts
- If you see "This app isn't verified", click "Advanced" → "Go to [project name]"

### Emails not sending
1. Check the **Status** column - is it `pending`?
2. Check the **Send At** time - is it in the past?
3. Run `testSend()` manually and check the Execution Log
4. Run `checkQuota()` to ensure you haven't hit daily limits

### Trigger not working
1. Go to Apps Script → Triggers (clock icon on left)
2. Check if a trigger exists for `processScheduledSends`
3. If not, run `createTrigger()` again

### Emails going to spam
- This sends from your actual Gmail account
- First few cold emails might need manual "Not spam" marking
- Consider warming up your sending pattern gradually

---

## Security Notes

- The script runs with your Google account permissions
- It can only send emails as you (not impersonate others)
- Data stays in your Google Sheet (not sent anywhere else)
- You can delete the script anytime to revoke access
