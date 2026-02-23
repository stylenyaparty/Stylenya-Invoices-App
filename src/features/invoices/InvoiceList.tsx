import { useEffect, useMemo, useState } from 'react'

import { FulfillmentMethod, InvoiceStatus } from '../../shared/domain/enums'
import { settingsService } from '../settings/settings.service'
import { invoiceService, type Invoice } from './invoice.service'

interface InvoiceListProps {
  onOpenInvoice: (invoiceId: string) => void
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

const todayYmd = () => new Date().toISOString().slice(0, 10)

export const InvoiceList = ({ onOpenInvoice }: InvoiceListProps) => {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadInvoices = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await invoiceService.listInvoices()
      setInvoices(result)
    } catch (loadError) {
      setError(String(loadError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadInvoices()
  }, [])

  const hasInvoices = useMemo(() => invoices.length > 0, [invoices])

  const handleCreateDraft = async () => {
    try {
      const settingsView = await settingsService.getSettingsView()
      const created = await invoiceService.createDraft({
        invoiceDate: todayYmd(),
        fulfillmentMethod: FulfillmentMethod.SHIP,
        shippingFee: 0,
        discountAmount: 0,
        taxRate: settingsView.primaryJurisdiction?.defaultTaxRate ?? 0,
        shippingTaxable: settingsView.settings.shippingTaxable,
        jurisdictionId: settingsView.primaryJurisdiction?.id ?? null,
        lines: [],
      })
      onOpenInvoice(created.id)
    } catch (createError) {
      setError(String(createError))
    }
  }

  const handleMarkPickup = async (invoiceId: string) => {
    setError(null)
    try {
      await invoiceService.updateDraft(invoiceId, {
        fulfillmentMethod: FulfillmentMethod.PICKUP,
        shippingFee: 0,
      })
      await loadInvoices()
    } catch (pickupError) {
      setError(String(pickupError))
    }
  }

  const handleDeleteDraft = async (invoiceId: string) => {
    setError(null)
    try {
      await invoiceService.deleteDraft(invoiceId)
      await loadInvoices()
    } catch (deleteError) {
      setError(String(deleteError))
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Invoices</h1>
        <button
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          onClick={() => void handleCreateDraft()}
          type="button"
        >
          Create New Invoice
        </button>
      </div>

      {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Invoice Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Net Items</th>
                <th className="px-4 py-3">Shipping</th>
                <th className="px-4 py-3">Tax</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={9}>
                    Loading invoices...
                  </td>
                </tr>
              )}

              {!loading && !hasInvoices && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={9}>
                    No invoices yet. Create one to get started.
                  </td>
                </tr>
              )}

              {!loading &&
                invoices.map((invoice) => (
                  <tr
                    className="cursor-pointer hover:bg-slate-50"
                    key={invoice.id}
                    onClick={() => onOpenInvoice(invoice.id)}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {invoice.invoiceNumber ?? InvoiceStatus.DRAFT}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{invoice.invoiceDate}</td>
                    <td className="px-4 py-3 text-slate-700">{invoice.status}</td>
                    <td className="px-4 py-3 text-slate-700">{invoice.paymentStatus}</td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrency(invoice.netItemsSalesSnap)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrency(invoice.shippingRevenueSnap)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrency(invoice.taxAmountSnap)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{formatCurrency(invoice.totalSnap)}</td>
                    <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                      {invoice.status === InvoiceStatus.DRAFT && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                            onClick={() => void handleMarkPickup(invoice.id)}
                            type="button"
                          >
                            Mark as Pickup
                          </button>
                          <button
                            className="rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                            onClick={() => void handleDeleteDraft(invoice.id)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
