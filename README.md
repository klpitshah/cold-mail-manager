# Cold Mail Manager

A local-first app for staging cold outreach emails, sending them through Gmail, and tracking follow-ups by company.

## Features

- **Staging** — Add contacts with company, role, job link, and notes. Email drafts are generated automatically from a template.
- **Outreach** — Browse contacts grouped by company in a tree view. Search, send, edit, and delete from one place.
- **Gmail integration** — Send initial emails and threaded follow-ups via the Gmail API (OAuth in the browser).
- **Status tracking** — Track staged vs sent contacts, last send date, and follow-up count.
- **Local persistence** — Contacts and settings are stored as JSON files on disk via a small Express API.

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
   - Create an OAuth 2.0 **Web application** client
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

- `data/contacts.json` — all contacts and send history
- `data/settings.json` — your display name for email signatures

The server creates these files automatically on first run. Back up `data/` if you want to preserve your outreach list.

## Project structure

```
├── src/           # React frontend (pages, hooks, Gmail client)
├── server/        # Express API and JSON file store
├── public/        # Static assets
└── data/          # Local data (not committed)
```

## Notes

- Gmail access tokens are stored in browser `localStorage`, not on the server.
- If you previously used an older localStorage-only version, contacts migrate automatically on first load when `data/contacts.json` is empty.
