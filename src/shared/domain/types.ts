import { FulfillmentMethod } from './enums'

export type Money = number

export interface InvoiceLineInput {
  id?: string
  title?: string
  qty: number
  unitPrice: number
  isTaxable: boolean
}

export interface InvoiceCalcInput {
  lines: InvoiceLineInput[]
  fulfillmentMethod: FulfillmentMethod
  shippingFee: number
  discountAmount: number
  taxRate: number
  shippingTaxable: boolean
}

export interface InvoiceTotals {
  taxableItemsSubtotal: Money
  nonTaxableItemsSubtotal: Money
  itemsSubtotal: Money
  discountAppliedToItems: Money
  taxableItemsAfterDiscount: Money
  taxBase: Money
  taxAmount: Money
  netItemsSales: Money
  shippingRevenue: Money
  total: Money
}

export interface NormalizedInvoiceLine extends InvoiceLineInput {
  lineTotal: number
}
