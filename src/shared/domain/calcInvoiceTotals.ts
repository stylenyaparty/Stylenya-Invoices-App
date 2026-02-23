import { FulfillmentMethod } from './enums'
import { assertNonNegative, round2 } from './money'
import type {
  InvoiceCalcInput,
  InvoiceLineInput,
  InvoiceTotals,
  NormalizedInvoiceLine,
} from './types'

export const normalizeLine = (line: InvoiceLineInput): NormalizedInvoiceLine => {
  assertNonNegative(line.qty, 'qty')
  assertNonNegative(line.unitPrice, 'unitPrice')

  return {
    ...line,
    lineTotal: line.qty * line.unitPrice,
  }
}

export const calcInvoiceTotals = (input: InvoiceCalcInput): InvoiceTotals => {
  assertNonNegative(input.discountAmount, 'discountAmount')
  assertNonNegative(input.taxRate, 'taxRate')
  assertNonNegative(input.shippingFee, 'shippingFee')

  const normalizedLines = input.lines.map(normalizeLine)

  const taxableItemsSubtotalRaw = normalizedLines
    .filter((line) => line.isTaxable)
    .reduce((sum, line) => sum + line.lineTotal, 0)

  const nonTaxableItemsSubtotalRaw = normalizedLines
    .filter((line) => !line.isTaxable)
    .reduce((sum, line) => sum + line.lineTotal, 0)

  const itemsSubtotalRaw = taxableItemsSubtotalRaw + nonTaxableItemsSubtotalRaw

  const discountAppliedToItemsRaw = Math.max(
    0,
    Math.min(input.discountAmount, itemsSubtotalRaw),
  )

  const discountAppliedToTaxableRaw = Math.min(
    discountAppliedToItemsRaw,
    taxableItemsSubtotalRaw,
  )

  const taxableItemsAfterDiscountRaw = Math.max(
    0,
    taxableItemsSubtotalRaw - discountAppliedToTaxableRaw,
  )

  const shippingFeeEffectiveRaw =
    input.fulfillmentMethod === FulfillmentMethod.PICKUP ? 0 : input.shippingFee

  const taxBaseRaw =
    taxableItemsAfterDiscountRaw +
    (input.shippingTaxable ? shippingFeeEffectiveRaw : 0)

  const taxAmount = round2(taxBaseRaw * input.taxRate)
  const netItemsSales = round2(itemsSubtotalRaw - discountAppliedToItemsRaw)
  const shippingRevenue = round2(shippingFeeEffectiveRaw)

  return {
    taxableItemsSubtotal: round2(taxableItemsSubtotalRaw),
    nonTaxableItemsSubtotal: round2(nonTaxableItemsSubtotalRaw),
    itemsSubtotal: round2(itemsSubtotalRaw),
    discountAppliedToItems: round2(discountAppliedToItemsRaw),
    taxableItemsAfterDiscount: round2(taxableItemsAfterDiscountRaw),
    taxBase: round2(taxBaseRaw),
    taxAmount,
    netItemsSales,
    shippingRevenue,
    total: round2(netItemsSales + shippingRevenue + taxAmount),
  }
}
