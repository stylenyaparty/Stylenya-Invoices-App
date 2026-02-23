import { calcInvoiceTotals } from '../../shared/domain/calcInvoiceTotals'
import {
  FulfillmentMethod,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../shared/domain/enums'
import { assertNonNegative } from '../../shared/domain/money'
import { withTransaction } from '../../shared/db'
import { settingsService } from '../settings/settings.service'
import type {
  InvoiceLineRecord,
  InvoiceRecord,
} from './invoice.repository'
import { invoiceRepository } from './invoice.repository'
import type { InvoiceCalcInput } from '../../shared/domain/types'

export interface InvoiceLine {
  id: string
  invoiceId: string
  title: string
  qty: number
  unitPrice: number
  isTaxable: boolean
  createdAt: string
}

export interface Invoice {
  id: string
  status: InvoiceStatus
  invoiceNumber: string | null
  invoiceDate: string
  paymentStatus: PaymentStatus
  paymentDate: string | null
  paymentMethod: PaymentMethod | null
  fulfillmentMethod: FulfillmentMethod
  shippingFee: number
  discountAmount: number
  taxRate: number
  shippingTaxable: boolean
  jurisdictionId: string | null
  taxableItemsSubtotalSnap: number
  nonTaxableItemsSubtotalSnap: number
  itemsSubtotalSnap: number
  discountAppliedToItemsSnap: number
  taxableItemsAfterDiscountSnap: number
  taxBaseSnap: number
  taxAmountSnap: number
  netItemsSalesSnap: number
  shippingRevenueSnap: number
  totalSnap: number
  approvedAt: string | null
  createdAt: string
  updatedAt: string
  lines: InvoiceLine[]
}

export interface CreateDraftInput {
  invoiceDate: string
  fulfillmentMethod: FulfillmentMethod
  shippingFee: number
  discountAmount: number
  taxRate: number
  shippingTaxable: boolean
  jurisdictionId?: string | null
  lines: Array<Pick<InvoiceLine, 'title' | 'qty' | 'unitPrice' | 'isTaxable'>>
}

export interface UpdateDraftPatch extends Partial<CreateDraftInput> {}

const nowIso = () => new Date().toISOString()
const ymdRegex = /^\d{4}-\d{2}-\d{2}$/

const assertDateYmd = (value: string, fieldName: string) => {
  if (!ymdRegex.test(value)) {
    throw new Error(`${fieldName} must be in YYYY-MM-DD format`)
  }
}

const assertValidDraftValues = (input: {
  shippingFee: number
  discountAmount: number
  taxRate: number
}) => {
  assertNonNegative(input.shippingFee, 'shippingFee')
  assertNonNegative(input.discountAmount, 'discountAmount')
  assertNonNegative(input.taxRate, 'taxRate')
}

const mapInvoice = (record: InvoiceRecord, lines: InvoiceLineRecord[]): Invoice => ({
  ...record,
  status: record.status as InvoiceStatus,
  paymentStatus: record.paymentStatus as PaymentStatus,
  paymentMethod: (record.paymentMethod as PaymentMethod | null) ?? null,
  fulfillmentMethod: record.fulfillmentMethod as FulfillmentMethod,
  shippingTaxable: record.shippingTaxable === 1,
  lines: lines.map((line) => ({ ...line, isTaxable: line.isTaxable === 1 })),
})

const getInvoiceOrThrow = async (id: string) => {
  const invoice = await invoiceRepository.getInvoiceById(id)
  if (!invoice) {
    throw new Error(`Invoice ${id} not found`)
  }
  return invoice
}

const ensureDraft = (invoice: InvoiceRecord) => {
  if (invoice.status !== InvoiceStatus.DRAFT) {
    throw new Error('Only DRAFT invoices can be modified')
  }
}

export const invoiceService = {
  async createDraft(input: CreateDraftInput): Promise<Invoice> {
    assertDateYmd(input.invoiceDate, 'invoiceDate')
    assertValidDraftValues(input)

    const createdAt = nowIso()
    const invoiceId = crypto.randomUUID()

    const invoice: InvoiceRecord = {
      id: invoiceId,
      status: InvoiceStatus.DRAFT,
      invoiceNumber: null,
      invoiceDate: input.invoiceDate,
      paymentStatus: PaymentStatus.UNPAID,
      paymentDate: null,
      paymentMethod: null,
      fulfillmentMethod: input.fulfillmentMethod,
      shippingFee: input.shippingFee,
      discountAmount: input.discountAmount,
      taxRate: input.taxRate,
      shippingTaxable: input.shippingTaxable ? 1 : 0,
      jurisdictionId: input.jurisdictionId ?? null,
      taxableItemsSubtotalSnap: 0,
      nonTaxableItemsSubtotalSnap: 0,
      itemsSubtotalSnap: 0,
      discountAppliedToItemsSnap: 0,
      taxableItemsAfterDiscountSnap: 0,
      taxBaseSnap: 0,
      taxAmountSnap: 0,
      netItemsSalesSnap: 0,
      shippingRevenueSnap: 0,
      totalSnap: 0,
      approvedAt: null,
      createdAt,
      updatedAt: createdAt,
    }

    const lines: InvoiceLineRecord[] = input.lines.map((line) => {
      assertNonNegative(line.qty, 'qty')
      assertNonNegative(line.unitPrice, 'unitPrice')

      return {
        id: crypto.randomUUID(),
        invoiceId,
        title: line.title ?? '',
        qty: line.qty,
        unitPrice: line.unitPrice,
        isTaxable: line.isTaxable ? 1 : 0,
        createdAt,
      }
    })

    await withTransaction(async (db) => {
      await invoiceRepository.createInvoice(invoice, db)
      await invoiceRepository.insertLines(lines, db)
    })

    return mapInvoice(invoice, lines)
  },

  async updateDraft(id: string, patch: UpdateDraftPatch): Promise<Invoice> {
    const existing = await getInvoiceOrThrow(id)
    ensureDraft(existing)

    const nextPatch: Partial<InvoiceRecord> = { updatedAt: nowIso() }

    if (patch.invoiceDate !== undefined) {
      assertDateYmd(patch.invoiceDate, 'invoiceDate')
      nextPatch.invoiceDate = patch.invoiceDate
    }
    if (patch.fulfillmentMethod !== undefined) {
      nextPatch.fulfillmentMethod = patch.fulfillmentMethod
    }
    if (patch.shippingFee !== undefined) {
      assertNonNegative(patch.shippingFee, 'shippingFee')
      nextPatch.shippingFee = patch.shippingFee
    }
    if (patch.discountAmount !== undefined) {
      assertNonNegative(patch.discountAmount, 'discountAmount')
      nextPatch.discountAmount = patch.discountAmount
    }
    if (patch.taxRate !== undefined) {
      assertNonNegative(patch.taxRate, 'taxRate')
      nextPatch.taxRate = patch.taxRate
    }
    if (patch.shippingTaxable !== undefined) {
      nextPatch.shippingTaxable = patch.shippingTaxable ? 1 : 0
    }
    if (patch.jurisdictionId !== undefined) {
      nextPatch.jurisdictionId = patch.jurisdictionId
    }

    await withTransaction(async (db) => {
      await invoiceRepository.updateDraftFields(id, nextPatch, db)

      if (patch.lines) {
        const lineRows = patch.lines.map((line) => {
          assertNonNegative(line.qty, 'qty')
          assertNonNegative(line.unitPrice, 'unitPrice')
          return {
            id: crypto.randomUUID(),
            invoiceId: id,
            title: line.title ?? '',
            qty: line.qty,
            unitPrice: line.unitPrice,
            isTaxable: line.isTaxable ? 1 : 0,
            createdAt: nowIso(),
          }
        })
        await invoiceRepository.replaceLines(id, lineRows, db)
      }
    })

    return this.getInvoiceById(id)
  },

  async deleteDraft(id: string): Promise<void> {
    const existing = await getInvoiceOrThrow(id)
    ensureDraft(existing)
    await invoiceRepository.deleteInvoice(id)
  },

  async listInvoices(): Promise<Invoice[]> {
    const invoices = await invoiceRepository.listInvoices()
    return Promise.all(
      invoices.map(async (invoice) => {
        const lines = await invoiceRepository.getInvoiceLines(invoice.id)
        return mapInvoice(invoice, lines)
      }),
    )
  },

  async getInvoiceById(id: string): Promise<Invoice> {
    const invoice = await getInvoiceOrThrow(id)
    const lines = await invoiceRepository.getInvoiceLines(id)
    return mapInvoice(invoice, lines)
  },

  async approveInvoice(id: string): Promise<Invoice> {
    return withTransaction(async (db) => {
      const invoice = await invoiceRepository.getInvoiceById(id, db)
      if (!invoice) {
        throw new Error(`Invoice ${id} not found`)
      }
      ensureDraft(invoice)

      const lines = await invoiceRepository.getInvoiceLines(id, db)
      const totals = calcInvoiceTotals({
        lines: lines.map((line) => ({
          qty: line.qty,
          unitPrice: line.unitPrice,
          isTaxable: line.isTaxable === 1,
          title: line.title,
          id: line.id,
        })),
        fulfillmentMethod: invoice.fulfillmentMethod as FulfillmentMethod,
        shippingFee: invoice.shippingFee,
        discountAmount: invoice.discountAmount,
        taxRate: invoice.taxRate,
        shippingTaxable: invoice.shippingTaxable === 1,
      })

      const invoiceNumber = await settingsService.getNextInvoiceNumberAndIncrement(db)
      const timestamp = nowIso()

      await invoiceRepository.markApproved(
        id,
        {
          invoiceNumber,
          approvedAt: timestamp,
          updatedAt: timestamp,
          taxableItemsSubtotalSnap: totals.taxableItemsSubtotal,
          nonTaxableItemsSubtotalSnap: totals.nonTaxableItemsSubtotal,
          itemsSubtotalSnap: totals.itemsSubtotal,
          discountAppliedToItemsSnap: totals.discountAppliedToItems,
          taxableItemsAfterDiscountSnap: totals.taxableItemsAfterDiscount,
          taxBaseSnap: totals.taxBase,
          taxAmountSnap: totals.taxAmount,
          netItemsSalesSnap: totals.netItemsSales,
          shippingRevenueSnap: totals.shippingRevenue,
          totalSnap: totals.total,
        },
        db,
      )

      const updated = await invoiceRepository.getInvoiceById(id, db)
      if (!updated) {
        throw new Error(`Invoice ${id} missing after approval`)
      }

      return mapInvoice(updated, lines)
    })
  },

  async markInvoicePaid(
    id: string,
    input: { paymentMethod: PaymentMethod; paymentDate: string },
  ): Promise<Invoice> {
    const invoice = await getInvoiceOrThrow(id)
    assertDateYmd(input.paymentDate, 'paymentDate')

    if (!input.paymentMethod) {
      throw new Error('paymentMethod is required')
    }
    if (input.paymentDate < invoice.invoiceDate) {
      throw new Error('paymentDate cannot be before invoiceDate')
    }

    await invoiceRepository.markPaid(id, input.paymentMethod, input.paymentDate, nowIso())

    return this.getInvoiceById(id)
  },
}
