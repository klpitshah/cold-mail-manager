import type { ReactNode } from 'react'

export type Page = 'outreach' | 'staging' | 'scheduled'

interface LayoutProps {
  page: Page
  onNavigate: (page: Page) => void
  stats: { total: number; staged: number; sent: number }
  scheduledCount: number
  gmailConnected: boolean
  gmailLoading: boolean
  gmailError: string | null
  onGmailConnect: () => void
  onGmailDisconnect: () => void
  children: ReactNode
}

const navItems: { id: Page; label: string; icon: ReactNode }[] = [
  {
    id: 'outreach',
    label: 'Outreach',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    ),
  },
  {
    id: 'staging',
    label: 'Staging',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    id: 'scheduled',
    label: 'Scheduled',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

export function Layout({
  page,
  onNavigate,
  stats,
  scheduledCount,
  gmailConnected,
  gmailLoading,
  gmailError,
  onGmailConnect,
  onGmailDisconnect,
  children,
}: LayoutProps) {
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-6 min-w-0">
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900">Cold Email Tracker</h1>
                  <p className="text-xs text-slate-500 hidden sm:block">Cold email outreach</p>
                </div>
              </div>

              <nav className="hidden sm:flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition ${
                      page === item.id
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden md:flex items-center gap-3 text-xs text-slate-500">
                <span><strong className="text-slate-700">{stats.total}</strong> total</span>
                <span><strong className="text-blue-600">{stats.staged}</strong> staged</span>
                <span><strong className="text-slate-600">{stats.sent}</strong> sent</span>
                {scheduledCount > 0 && (
                  <span><strong className="text-violet-700">{scheduledCount}</strong> scheduled</span>
                )}
              </div>

              {gmailConnected ? (
                <button
                  onClick={onGmailDisconnect}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Gmail connected
                </button>
              ) : (
                <button
                  onClick={onGmailConnect}
                  disabled={gmailLoading}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-60"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  {gmailLoading ? 'Connecting…' : 'Connect Gmail'}
                </button>
              )}
            </div>
          </div>

          {gmailError && (
            <p className="mt-2 text-xs text-red-600">{gmailError}</p>
          )}

          <nav className="flex sm:hidden items-center gap-1 mt-3 bg-slate-100 rounded-lg p-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition ${
                  page === item.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">{children}</main>
    </div>
  )
}
