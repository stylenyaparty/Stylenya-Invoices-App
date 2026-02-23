import { describe, expect, it } from 'vitest'

import { calcInvoiceTotals } from '../calcInvoiceTotals'
import { FulfillmentMethod } from '../enums'

describe('calcInvoiceTotals', () => {
  it('calculates Etsy-like shipping taxable scenario', () => {
    const totals = calcInvoiceTotals({
      lines: [{ qty: 1, unitPrice: 19.99, isTaxable: true }],
      fulfillmentMethod: FulfillmentMethod.SHIP,
      shippingFee: 7.3,
      discountAmount: 3,
      taxRate: 0.07,
      shippingTaxable: true,
    })

    expect(totals.taxableItemsSubtotal).toBe(19.99)
    expect(totals.discountAppliedToItems).toBe(3)
    expect(totals.taxableItemsAfterDiscount).toBe(16.99)
    expect(totals.taxBase).toBe(24.29)
    expect(totals.taxAmount).toBe(1.7)
    expect(totals.total).toBe(25.99)
  })

  it('ignores shipping for pickup and calculates pre-tax discount correctly', () => {
    const totals = calcInvoiceTotals({
      lines: [{ qty: 2, unitPrice: 21.99, isTaxable: true }],
      fulfillmentMethod: FulfillmentMethod.PICKUP,
      shippingFee: 100,
      discountAmount: 12.06,
      taxRate: 0.07,
      shippingTaxable: true,
    })

    expect(totals.taxableItemsSubtotal).toBe(43.98)
    expect(totals.taxableItemsAfterDiscount).toBe(31.92)
    expect(totals.taxBase).toBe(31.92)
    expect(totals.taxAmount).toBe(2.23)
    expect(totals.total).toBe(34.15)
    expect(totals.shippingRevenue).toBe(0)
  })

  it('handles non-taxable freebies and taxes only taxable lines', () => {
    const totals = calcInvoiceTotals({
      lines: [
        { qty: 1, unitPrice: 10, isTaxable: true },
        { qty: 1, unitPrice: 0, isTaxable: false },
      ],
      fulfillmentMethod: FulfillmentMethod.SHIP,
      shippingFee: 0,
      discountAmount: 0,
      taxRate: 0.07,
      shippingTaxable: false,
    })

    expect(totals.taxableItemsSubtotal).toBe(10)
    expect(totals.taxBase).toBe(10)
    expect(totals.taxAmount).toBe(0.7)
    expect(totals.total).toBe(10.7)
  })

  it('caps discount at item subtotal', () => {
    const totals = calcInvoiceTotals({
      lines: [{ qty: 1, unitPrice: 10, isTaxable: true }],
      fulfillmentMethod: FulfillmentMethod.SHIP,
      shippingFee: 0,
      discountAmount: 25,
      taxRate: 0.07,
      shippingTaxable: false,
    })

    expect(totals.itemsSubtotal).toBe(10)
    expect(totals.discountAppliedToItems).toBe(10)
    expect(totals.netItemsSales).toBe(0)
    expect(totals.taxableItemsAfterDiscount).toBe(0)
    expect(totals.taxAmount).toBe(0)
  })

  it('excludes shipping from tax base when shipping is not taxable', () => {
    const totals = calcInvoiceTotals({
      lines: [{ qty: 1, unitPrice: 20, isTaxable: true }],
      fulfillmentMethod: FulfillmentMethod.SHIP,
      shippingFee: 10,
      discountAmount: 0,
      taxRate: 0.07,
      shippingTaxable: false,
    })

    expect(totals.taxableItemsAfterDiscount).toBe(20)
    expect(totals.taxBase).toBe(20)
    expect(totals.taxAmount).toBe(1.4)
    expect(totals.shippingRevenue).toBe(10)
    expect(totals.total).toBe(31.4)
  })

  it('throws clear validation errors for negative inputs', () => {
    expect(() =>
      calcInvoiceTotals({
        lines: [{ qty: 1, unitPrice: -1, isTaxable: true }],
        fulfillmentMethod: FulfillmentMethod.SHIP,
        shippingFee: 0,
        discountAmount: 0,
        taxRate: 0,
        shippingTaxable: false,
      }),
    ).toThrow('unitPrice cannot be negative')

    expect(() =>
      calcInvoiceTotals({
        lines: [{ qty: 1, unitPrice: 1, isTaxable: true }],
        fulfillmentMethod: FulfillmentMethod.SHIP,
        shippingFee: 0,
        discountAmount: -0.01,
        taxRate: 0,
        shippingTaxable: false,
      }),
    ).toThrow('discountAmount cannot be negative')

    expect(() =>
      calcInvoiceTotals({
        lines: [{ qty: 1, unitPrice: 1, isTaxable: true }],
        fulfillmentMethod: FulfillmentMethod.SHIP,
        shippingFee: 0,
        discountAmount: 0,
        taxRate: -0.01,
        shippingTaxable: false,
      }),
    ).toThrow('taxRate cannot be negative')

    expect(() =>
      calcInvoiceTotals({
        lines: [{ qty: 1, unitPrice: 1, isTaxable: true }],
        fulfillmentMethod: FulfillmentMethod.SHIP,
        shippingFee: -1,
        discountAmount: 0,
        taxRate: 0,
        shippingTaxable: false,
      }),
    ).toThrow('shippingFee cannot be negative')
  })
})
