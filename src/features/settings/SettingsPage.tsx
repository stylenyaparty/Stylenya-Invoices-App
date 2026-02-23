import { type FormEvent, useEffect, useState } from 'react'

import { settingsService } from './settings.service'

export const SettingsPage = () => {
  const [invoicePrefix, setInvoicePrefix] = useState('INV')
  const [shippingTaxable, setShippingTaxable] = useState(true)
  const [stateValue, setStateValue] = useState('')
  const [county, setCounty] = useState('')
  const [taxRate, setTaxRate] = useState('0')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadSettings = async () => {
    setLoading(true)
    setError(null)

    try {
      const view = await settingsService.getSettingsView()
      setInvoicePrefix(view.settings.invoicePrefix)
      setShippingTaxable(view.settings.shippingTaxable)
      setStateValue(view.primaryJurisdiction?.state ?? '')
      setCounty(view.primaryJurisdiction?.county ?? '')
      setTaxRate(String(view.primaryJurisdiction?.defaultTaxRate ?? 0))
    } catch (loadError) {
      setError(String(loadError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSettings()
  }, [])

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)

    try {
      const view = await settingsService.saveSettings({
        invoicePrefix,
        shippingTaxable,
        state: stateValue,
        county,
        defaultTaxRate: Number(taxRate),
      })

      setInvoicePrefix(view.settings.invoicePrefix)
      setShippingTaxable(view.settings.shippingTaxable)
      setStateValue(view.primaryJurisdiction?.state ?? '')
      setCounty(view.primaryJurisdiction?.county ?? '')
      setTaxRate(String(view.primaryJurisdiction?.defaultTaxRate ?? 0))
      setMessage('Settings saved successfully.')
    } catch (saveError) {
      setError(String(saveError))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-slate-600">Loading settings...</p>
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>

      {message && <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}
      {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <form className="space-y-6 rounded-lg border border-slate-200 bg-white p-4 sm:p-6" onSubmit={handleSave}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Invoice Prefix</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              onChange={(event) => setInvoicePrefix(event.target.value)}
              required
              value={invoicePrefix}
            />
          </label>

          <label className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700">
            <input
              checked={shippingTaxable}
              className="h-4 w-4"
              onChange={(event) => setShippingTaxable(event.target.checked)}
              type="checkbox"
            />
            Shipping Taxable
          </label>
        </div>

        <div className="space-y-3 rounded-md border border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-slate-900">Primary Jurisdiction</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700">State</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                onChange={(event) => setStateValue(event.target.value)}
                required
                value={stateValue}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700">County</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                onChange={(event) => setCounty(event.target.value)}
                required
                value={county}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700">Tax Rate</span>
              <input
                className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-slate-600"
                readOnly
                type="text"
                value={taxRate}
              />
            </label>
          </div>
          <p className="text-xs text-slate-500">Tax rate is persisted and used for new draft calculations.</p>
        </div>

        <button
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          disabled={saving}
          type="submit"
        >
          Save
        </button>
      </form>
    </section>
  )
}
