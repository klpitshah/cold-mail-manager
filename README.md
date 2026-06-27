# Cold Email Tracker

A local-first app for staging cold outreach emails, sending them through Gmail, and tracking follow-ups by company.

## Features

- **Staging** - Add contacts with company, role, job link, and notes. Email drafts are generated automatically from a template.
- **Outreach** - Browse contacts grouped by company in a tree view. Search, send, edit, and delete from one place.
- **Gmail integration** - Send initial emails and threaded follow-ups via the Gmail API (OAuth in the browser).
- **Status tracking** - Track staged vs sent contacts, last send date, and follow-up count.
- **Local persistence** - Contacts and settings are stored as JSON files on disk via a small Express API.

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4
- **Backend:** Express (port 3001), file-based storage in `data/`

## Prerequisites

- Node.js 18+
- A [Google Cloud OAuth 2.0 client ID](https://console.cloud.google.com/apis/credentials) (Web application type)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure Gmail OAuth**

   Create a `.env` file in the project root:

   ```env
   VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
   ```

   In Google Cloud Console:

   - Enable the **Gmail API** for your project
   - Enable the **Google Sheets API** (for scheduled sends sync)
   - Create an OAuth 2.0 **Web application** client
   - Copy the client ID into `VITE_GOOGLE_CLIENT_ID`
   - Add `http://localhost:5173` to **Authorized JavaScript origins**
   - Add your Google account under **Test users** (while the app is in testing mode)

3. **Run the app**

   ```bash
   npm run dev
   ```

   This starts the API server (`http://localhost:3001`) and Vite dev server (`http://localhost:5173`) together.

4. **Connect Gmail** — Click **Connect Gmail** in the header and authorize the app.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API + frontend in development |
| `npm run dev:client` | Frontend only (Vite) |
| `npm run dev:server` | API server only |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run Oxlint |

## Data storage

Contact and settings data lives in `data/` (gitignored):

- `data/contacts.json` - all contacts and send history
- `data/settings.json` - your display name for email signatures

The server creates these files automatically on first run. Back up `data/` if you want to preserve your outreach list.

## Project structure

```
├── src/           # React frontend (pages, hooks, Gmail client)
├── server/        # Express API and JSON file store
├── public/        # Static assets
└── data/          # Local data (not committed)
```

## Scheduled Sends

Scheduled emails are sent by Google Apps Script running on Google's servers - your computer doesn't need to be on.

### One-time Setup (~5 min)

1. **Create a Google Sheet** at [sheets.google.com](https://sheets.google.com)

2. **Add the Apps Script:**
   - In your sheet, go to **Extensions → Apps Script**
   - Paste the code from [`scripts/google-apps-script/Code.gs`](scripts/google-apps-script/Code.gs)
   - Run `setupSheet` and `createTrigger`
   - See [`scripts/google-apps-script/README.md`](scripts/google-apps-script/README.md) for details

3. **Link the sheet in the app:**
   - Click **"Setup Google Sheet"** in the scheduled sends banner
   - Paste your Google Sheet URL

### Usage

Once set up, just click **"Sync to Sheet"** in the scheduled sends banner. Your scheduled emails will be sent by Google's servers even when your computer is off.

This uses Gmail's native sending from your account — no third-party services.

## Notes

- Gmail access tokens are stored in browser `localStorage` for sending test emails and syncing to Google Sheets.
- Scheduled emails are sent by Google Apps Script, not by this app. You can close your computer after syncing.
- If you previously used an older localStorage-only version, contacts migrate automatically on first load when `data/contacts.json` is empty.
