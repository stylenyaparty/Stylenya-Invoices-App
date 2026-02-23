import { FulfillmentMethod, PaymentMethod } from '../shared/domain/enums'
import { getDb } from '../shared/db'
import { invoiceService } from '../features/invoices/invoice.service'

export const runSmokeTest = async () => {
  await getDb()

  const draft = await invoiceService.createDraft({
    invoiceDate: new Date().toISOString().slice(0, 10),
    fulfillmentMethod: FulfillmentMethod.SHIP,
    shippingFee: 12.5,
    discountAmount: 5,
    taxRate: 0.0825,
    shippingTaxable: true,
    lines: [
      { title: 'Bundle A', qty: 2, unitPrice: 25, isTaxable: true },
      { title: 'Service Fee', qty: 1, unitPrice: 10, isTaxable: false },
    ],
  })

  const approved = await invoiceService.approveInvoice(draft.id)
  const paid = await invoiceService.markInvoicePaid(approved.id, {
    paymentMethod: PaymentMethod.ZELLE,
    paymentDate: draft.invoiceDate,
  })
  const invoices = await invoiceService.listInvoices()

  console.log('[smoke] draft', draft)
  console.log('[smoke] approved', approved)
  console.log('[smoke] paid', paid)
  console.log('[smoke] invoices', invoices)

  return { draft, approved, paid, invoices }
}
