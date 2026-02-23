import type Database from '@tauri-apps/plugin-sql'

import { getDb } from '../../shared/db'

export interface InvoiceRecord {
  id: string
  status: string
  invoiceNumber: string | null
  invoiceDate: string
  paymentStatus: string
  paymentDate: string | null
  paymentMethod: string | null
  fulfillmentMethod: string
  shippingFee: number
  discountAmount: number
  taxRate: number
  shippingTaxable: number
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
}

export interface InvoiceLineRecord {
  id: string
  invoiceId: string
  title: string
  qty: number
  unitPrice: number
  isTaxable: number
  createdAt: string
}

const resolveDb = async (db?: Database) => db ?? getDb()

const toInvoiceRecord = (row: Record<string, unknown>): InvoiceRecord => ({
  id: String(row.id),
  status: String(row.status),
  invoiceNumber: (row.invoiceNumber as string | null) ?? null,
  invoiceDate: String(row.invoiceDate),
  paymentStatus: String(row.paymentStatus),
  paymentDate: (row.paymentDate as string | null) ?? null,
  paymentMethod: (row.paymentMethod as string | null) ?? null,
  fulfillmentMethod: String(row.fulfillmentMethod),
  shippingFee: Number(row.shippingFee),
  discountAmount: Number(row.discountAmount),
  taxRate: Number(row.taxRate),
  shippingTaxable: Number(row.shippingTaxable),
  jurisdictionId: (row.jurisdictionId as string | null) ?? null,
  taxableItemsSubtotalSnap: Number(row.taxableItemsSubtotalSnap),
  nonTaxableItemsSubtotalSnap: Number(row.nonTaxableItemsSubtotalSnap),
  itemsSubtotalSnap: Number(row.itemsSubtotalSnap),
  discountAppliedToItemsSnap: Number(row.discountAppliedToItemsSnap),
  taxableItemsAfterDiscountSnap: Number(row.taxableItemsAfterDiscountSnap),
  taxBaseSnap: Number(row.taxBaseSnap),
  taxAmountSnap: Number(row.taxAmountSnap),
  netItemsSalesSnap: Number(row.netItemsSalesSnap),
  shippingRevenueSnap: Number(row.shippingRevenueSnap),
  totalSnap: Number(row.totalSnap),
  approvedAt: (row.approvedAt as string | null) ?? null,
  createdAt: String(row.createdAt),
  updatedAt: String(row.updatedAt),
})

const toInvoiceLineRecord = (row: Record<string, unknown>): InvoiceLineRecord => ({
  id: String(row.id),
  invoiceId: String(row.invoiceId),
  title: String(row.title),
  qty: Number(row.qty),
  unitPrice: Number(row.unitPrice),
  isTaxable: Number(row.isTaxable),
  createdAt: String(row.createdAt),
})

export const invoiceRepository = {
  async createInvoice(record: InvoiceRecord, db?: Database) {
    const conn = await resolveDb(db)
    await conn.execute(
      `INSERT INTO invoices (
        id, status, invoiceNumber, invoiceDate, paymentStatus, paymentDate,
        paymentMethod, fulfillmentMethod, shippingFee, discountAmount, taxRate,
        shippingTaxable, jurisdictionId, taxableItemsSubtotalSnap,
        nonTaxableItemsSubtotalSnap, itemsSubtotalSnap, discountAppliedToItemsSnap,
        taxableItemsAfterDiscountSnap, taxBaseSnap, taxAmountSnap,
        netItemsSalesSnap, shippingRevenueSnap, totalSnap, approvedAt,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.status,
        record.invoiceNumber,
        record.invoiceDate,
        record.paymentStatus,
        record.paymentDate,
        record.paymentMethod,
        record.fulfillmentMethod,
        record.shippingFee,
        record.discountAmount,
        record.taxRate,
        record.shippingTaxable,
        record.jurisdictionId,
        record.taxableItemsSubtotalSnap,
        record.nonTaxableItemsSubtotalSnap,
        record.itemsSubtotalSnap,
        record.discountAppliedToItemsSnap,
        record.taxableItemsAfterDiscountSnap,
        record.taxBaseSnap,
        record.taxAmountSnap,
        record.netItemsSalesSnap,
        record.shippingRevenueSnap,
        record.totalSnap,
        record.approvedAt,
        record.createdAt,
        record.updatedAt,
      ],
    )
  },

  async insertLines(lines: InvoiceLineRecord[], db?: Database) {
    const conn = await resolveDb(db)
    for (const line of lines) {
      await conn.execute(
        'INSERT INTO invoice_lines (id, invoiceId, title, qty, unitPrice, isTaxable, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [line.id, line.invoiceId, line.title, line.qty, line.unitPrice, line.isTaxable, line.createdAt],
      )
    }
  },

  async listInvoices(db?: Database): Promise<InvoiceRecord[]> {
    const conn = await resolveDb(db)
    const rows = await conn.select<Record<string, unknown>>(
      'SELECT * FROM invoices ORDER BY createdAt DESC',
    )
    return rows.map(toInvoiceRecord)
  },

  async getInvoiceById(id: string, db?: Database): Promise<InvoiceRecord | null> {
    const conn = await resolveDb(db)
    const rows = await conn.select<Record<string, unknown>>(
      'SELECT * FROM invoices WHERE id = ? LIMIT 1',
      [id],
    )
    return rows[0] ? toInvoiceRecord(rows[0]) : null
  },

  async getInvoiceLines(invoiceId: string, db?: Database): Promise<InvoiceLineRecord[]> {
    const conn = await resolveDb(db)
    const rows = await conn.select<Record<string, unknown>>(
      'SELECT * FROM invoice_lines WHERE invoiceId = ? ORDER BY createdAt ASC',
      [invoiceId],
    )
    return rows.map(toInvoiceLineRecord)
  },

  async replaceLines(invoiceId: string, lines: InvoiceLineRecord[], db?: Database) {
    const conn = await resolveDb(db)
    await conn.execute('DELETE FROM invoice_lines WHERE invoiceId = ?', [invoiceId])
    await this.insertLines(lines, conn)
  },

  async updateDraftFields(
    id: string,
    patch: Partial<
      Pick<
        InvoiceRecord,
        'invoiceDate' | 'fulfillmentMethod' | 'shippingFee' | 'discountAmount' | 'taxRate' | 'shippingTaxable' | 'jurisdictionId' | 'updatedAt'
      >
    >,
    db?: Database,
  ) {
    const conn = await resolveDb(db)
    const updates: string[] = []
    const values: unknown[] = []

    for (const [key, value] of Object.entries(patch)) {
      updates.push(`${key} = ?`)
      values.push(value)
    }

    if (updates.length === 0) {
      return
    }

    values.push(id)
    await conn.execute(`UPDATE invoices SET ${updates.join(', ')} WHERE id = ?`, values)
  },

  async deleteInvoice(id: string, db?: Database) {
    const conn = await resolveDb(db)
    await conn.execute('DELETE FROM invoices WHERE id = ?', [id])
  },

  async markApproved(
    id: string,
    values: {
      invoiceNumber: string
      approvedAt: string
      updatedAt: string
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
    },
    db?: Database,
  ) {
    const conn = await resolveDb(db)
    await conn.execute(
      `UPDATE invoices
       SET status = 'APPROVED', invoiceNumber = ?, approvedAt = ?, updatedAt = ?,
           taxableItemsSubtotalSnap = ?, nonTaxableItemsSubtotalSnap = ?, itemsSubtotalSnap = ?,
           discountAppliedToItemsSnap = ?, taxableItemsAfterDiscountSnap = ?, taxBaseSnap = ?,
           taxAmountSnap = ?, netItemsSalesSnap = ?, shippingRevenueSnap = ?, totalSnap = ?
       WHERE id = ?`,
      [
        values.invoiceNumber,
        values.approvedAt,
        values.updatedAt,
        values.taxableItemsSubtotalSnap,
        values.nonTaxableItemsSubtotalSnap,
        values.itemsSubtotalSnap,
        values.discountAppliedToItemsSnap,
        values.taxableItemsAfterDiscountSnap,
        values.taxBaseSnap,
        values.taxAmountSnap,
        values.netItemsSalesSnap,
        values.shippingRevenueSnap,
        values.totalSnap,
        id,
      ],
    )
  },

  async markPaid(
    id: string,
    paymentMethod: string,
    paymentDate: string,
    updatedAt: string,
    db?: Database,
  ) {
    const conn = await resolveDb(db)
    await conn.execute(
      `UPDATE invoices
       SET paymentStatus = 'PAID', paymentMethod = ?, paymentDate = ?, updatedAt = ?
       WHERE id = ?`,
      [paymentMethod, paymentDate, updatedAt, id],
    )
  },
}
