import type Database from '@tauri-apps/plugin-sql'

import { getDb } from '../../shared/db'

export interface SettingsRecord {
  id: 'singleton'
  invoicePrefix: string
  nextInvoiceSeq: number
  shippingTaxable: number
  primaryJurisdictionId: string | null
  createdAt: string
  updatedAt: string
}

const toSettingsRecord = (row: Record<string, unknown>): SettingsRecord => ({
  id: row.id as 'singleton',
  invoicePrefix: String(row.invoicePrefix),
  nextInvoiceSeq: Number(row.nextInvoiceSeq),
  shippingTaxable: Number(row.shippingTaxable),
  primaryJurisdictionId: (row.primaryJurisdictionId as string | null) ?? null,
  createdAt: String(row.createdAt),
  updatedAt: String(row.updatedAt),
})

const resolveDb = async (db?: Database) => db ?? getDb()

export const settingsRepository = {
  async getSettings(db?: Database): Promise<SettingsRecord> {
    const conn = await resolveDb(db)
    const rows = await conn.select<Record<string, unknown>>(
      'SELECT * FROM settings WHERE id = ? LIMIT 1',
      ['singleton'],
    )

    if (!rows[0]) {
      throw new Error('Settings singleton row does not exist')
    }

    return toSettingsRecord(rows[0])
  },

  async updateInvoicePrefix(prefix: string, updatedAt: string, db?: Database) {
    const conn = await resolveDb(db)
    await conn.execute(
      'UPDATE settings SET invoicePrefix = ?, updatedAt = ? WHERE id = ?',
      [prefix, updatedAt, 'singleton'],
    )
  },

  async incrementInvoiceSeq(nextSeq: number, updatedAt: string, db?: Database) {
    const conn = await resolveDb(db)
    await conn.execute(
      'UPDATE settings SET nextInvoiceSeq = ?, updatedAt = ? WHERE id = ?',
      [nextSeq, updatedAt, 'singleton'],
    )
  },
}
