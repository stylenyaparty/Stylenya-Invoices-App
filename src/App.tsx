import { useState } from 'react'

import { NavBar } from './app/NavBar'
import { InvoiceDetail } from './features/invoices/InvoiceDetail'
import { InvoiceList } from './features/invoices/InvoiceList'
import { SettingsPage } from './features/settings/SettingsPage'

type AppPage = 'invoices' | 'settings' | 'reports'

function App() {
  const [page, setPage] = useState<AppPage>('invoices')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <NavBar
        active={page}
        onNavigate={(nextPage) => {
          setPage(nextPage)
          if (nextPage !== 'invoices') {
            setSelectedInvoiceId(null)
          }
        }}
      />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {page === 'invoices' && !selectedInvoiceId && (
          <InvoiceList
            onOpenInvoice={(invoiceId) => {
              setSelectedInvoiceId(invoiceId)
              setPage('invoices')
            }}
          />
        )}

        {page === 'invoices' && selectedInvoiceId && (
          <InvoiceDetail invoiceId={selectedInvoiceId} onBack={() => setSelectedInvoiceId(null)} />
        )}

        {page === 'settings' && <SettingsPage />}

        {page === 'reports' && (
          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
            <p className="mt-2 text-sm text-slate-600">Reports UI will be added in a future block.</p>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
