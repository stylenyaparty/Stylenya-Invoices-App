import { useEffect, useMemo, useState } from 'react'

import {
  FulfillmentMethod,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../shared/domain/enums'
import { invoiceService, type Invoice } from './invoice.service'

interface InvoiceDetailProps {
  invoiceId: string
  onBack: () => void
}

interface EditableLine {
  title: string
  qty: number
  unitPrice: number
  isTaxable: boolean
}

const paymentMethods = Object.values(PaymentMethod)

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

const todayYmd = () => new Date().toISOString().slice(0, 10)

export const InvoiceDetail = ({ invoiceId, onBack }: InvoiceDetailProps) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [invoiceDate, setInvoiceDate] = useState(todayYmd())
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>(FulfillmentMethod.SHIP)
  const [shippingFee, setShippingFee] = useState('0')
  const [discountAmount, setDiscountAmount] = useState('0')
  const [lines, setLines] = useState<EditableLine[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.ZELLE)
  const [paymentDate, setPaymentDate] = useState(todayYmd())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadInvoice = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await invoiceService.getInvoiceById(invoiceId)
      setInvoice(data)
      setInvoiceDate(data.invoiceDate)
      setFulfillmentMethod(data.fulfillmentMethod)
      setShippingFee(String(data.shippingFee))
      setDiscountAmount(String(data.discountAmount))
      setLines(
        data.lines.map((line) => ({
          title: line.title,
          qty: line.qty,
          unitPrice: line.unitPrice,
          isTaxable: line.isTaxable,
        })),
      )
      setPaymentMethod(data.paymentMethod ?? PaymentMethod.ZELLE)
      setPaymentDate(data.paymentDate ?? todayYmd())
    } catch (loadError) {
      setError(String(loadError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadInvoice()
  }, [invoiceId])

  const isDraft = invoice?.status === InvoiceStatus.DRAFT

  const printableTitle = useMemo(
    () => invoice?.invoiceNumber ?? `${InvoiceStatus.DRAFT} (${invoice?.id.slice(0, 8) ?? ''})`,
    [invoice],
  )

  const parseAmount = (value: string) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const handleDraftSave = async (): Promise<boolean> => {
    if (!invoice) {
      return false
    }

    setSaving(true)
    setError(null)

    try {
      await invoiceService.updateDraft(invoice.id, {
        invoiceDate,
        fulfillmentMethod,
        shippingFee: fulfillmentMethod === FulfillmentMethod.PICKUP ? 0 : parseAmount(shippingFee),
        discountAmount: parseAmount(discountAmount),
        lines,
      })
      await loadInvoice()
      return true
    } catch (saveError) {
      setError(String(saveError))
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async () => {
    if (!invoice) {
      return
    }

    const didSave = await handleDraftSave()
    if (!didSave) {
      return
    }

    setSaving(true)
    try {
      await invoiceService.approveInvoice(invoice.id)
      await loadInvoice()
    } catch (approveError) {
      setError(String(approveError))
    } finally {
      setSaving(false)
    }
  }

  const handleMarkPaid = async () => {
    if (!invoice) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      await invoiceService.markInvoicePaid(invoice.id, { paymentMethod, paymentDate })
      await loadInvoice()
    } catch (markPaidError) {
      setError(String(markPaidError))
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const updateLine = <K extends keyof EditableLine>(index: number, key: K, value: EditableLine[K]) => {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, [key]: value } : line)))
  }

  if (loading) {
    return <p className="text-slate-600">Loading invoice...</p>
  }

  if (!invoice) {
    return <p className="text-red-600">Invoice not found.</p>
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <button className="text-sm font-medium text-blue-700 hover:text-blue-800" onClick={onBack} type="button">
          ← Back to invoices
        </button>
        <p className="text-sm text-slate-500">Invoice: {printableTitle}</p>
      </div>

      {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="print:border-0 rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
        {isDraft ? (
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault()
              void handleDraftSave()
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700">Invoice Date</span>
                <input
                  className="rounded-md border border-slate-300 px-3 py-2"
                  onChange={(event) => setInvoiceDate(event.target.value)}
                  required
                  type="date"
                  value={invoiceDate}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700">Fulfillment Method</span>
                <select
                  className="rounded-md border border-slate-300 px-3 py-2"
                  onChange={(event) => setFulfillmentMethod(event.target.value as FulfillmentMethod)}
                  value={fulfillmentMethod}
                >
                  <option value={FulfillmentMethod.SHIP}>SHIP</option>
                  <option value={FulfillmentMethod.PICKUP}>PICKUP</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700">Shipping Fee</span>
                <input
                  className="rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                  disabled={fulfillmentMethod === FulfillmentMethod.PICKUP}
                  min="0"
                  onChange={(event) => setShippingFee(event.target.value)}
                  step="0.01"
                  type="number"
                  value={fulfillmentMethod === FulfillmentMethod.PICKUP ? '0' : shippingFee}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700">Discount</span>
                <input
                  className="rounded-md border border-slate-300 px-3 py-2"
                  min="0"
                  onChange={(event) => setDiscountAmount(event.target.value)}
                  step="0.01"
                  type="number"
                  value={discountAmount}
                />
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Line Items</h2>
                <button
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() =>
                    setLines((current) => [...current, { title: '', qty: 1, unitPrice: 0, isTaxable: true }])
                  }
                  type="button"
                >
                  Add Line Item
                </button>
              </div>

              <div className="overflow-x-auto rounded-md border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Title</th>
                      <th className="px-3 py-2">Qty</th>
                      <th className="px-3 py-2">Price</th>
                      <th className="px-3 py-2">Taxable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {lines.map((line, index) => (
                      <tr key={`${index}-${line.title}`}>
                        <td className="px-3 py-2">
                          <input
                            className="w-full rounded-md border border-slate-300 px-2 py-1"
                            onChange={(event) => updateLine(index, 'title', event.target.value)}
                            required
                            value={line.title}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className="w-24 rounded-md border border-slate-300 px-2 py-1"
                            min="0"
                            onChange={(event) => updateLine(index, 'qty', Number(event.target.value))}
                            required
                            step="1"
                            type="number"
                            value={line.qty}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className="w-28 rounded-md border border-slate-300 px-2 py-1"
                            min="0"
                            onChange={(event) => updateLine(index, 'unitPrice', Number(event.target.value))}
                            required
                            step="0.01"
                            type="number"
                            value={line.unitPrice}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            checked={line.isTaxable}
                            className="h-4 w-4"
                            onChange={(event) => updateLine(index, 'isTaxable', event.target.checked)}
                            type="checkbox"
                          />
                        </td>
                      </tr>
                    ))}
                    {lines.length === 0 && (
                      <tr>
                        <td className="px-3 py-4 text-center text-slate-500" colSpan={4}>
                          No line items yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                disabled={saving}
                type="submit"
              >
                Save Draft
              </button>
              <button
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                disabled={saving}
                onClick={() => void handleApprove()}
                type="button"
              >
                Approve
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                <p className="text-sm text-slate-900">{invoice.status}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice Date</p>
                <p className="text-sm text-slate-900">{invoice.invoiceDate}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice #</p>
                <p className="text-sm text-slate-900">{invoice.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</p>
                <p className="text-sm font-semibold text-slate-900">{formatCurrency(invoice.totalSnap)}</p>
              </div>
            </div>

            <div className="rounded-md border border-slate-200 p-4">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Payment</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment Status</p>
                  <p className="text-sm text-slate-900">{invoice.paymentStatus}</p>
                </div>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-700">Payment Method</span>
                  <select
                    className="rounded-md border border-slate-300 px-3 py-2"
                    onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                    value={paymentMethod}
                  >
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-700">Payment Date</span>
                  <input
                    className="rounded-md border border-slate-300 px-3 py-2"
                    onChange={(event) => setPaymentDate(event.target.value)}
                    required
                    type="date"
                    value={paymentDate}
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {invoice.paymentStatus !== PaymentStatus.PAID && (
                  <button
                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                    onClick={() => void handleMarkPaid()}
                    type="button"
                  >
                    Mark Paid
                  </button>
                )}
                <button
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={handlePrint}
                  type="button"
                >
                  Print
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
