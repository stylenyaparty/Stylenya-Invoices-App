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

export interface JurisdictionRecord {
  id: string
  state: string
  county: string
  defaultTaxRate: number
  isPrimary: number
  createdAt: string
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

const toJurisdictionRecord = (row: Record<string, unknown>): JurisdictionRecord => ({
  id: String(row.id),
  state: String(row.state),
  county: String(row.county),
  defaultTaxRate: Number(row.defaultTaxRate),
  isPrimary: Number(row.isPrimary),
  createdAt: String(row.createdAt),
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

  async getJurisdictionById(id: string, db?: Database): Promise<JurisdictionRecord | null> {
    const conn = await resolveDb(db)
    const rows = await conn.select<Record<string, unknown>>(
      'SELECT * FROM business_jurisdictions WHERE id = ? LIMIT 1',
      [id],
    )

    return rows[0] ? toJurisdictionRecord(rows[0]) : null
  },

  async getPrimaryJurisdiction(db?: Database): Promise<JurisdictionRecord | null> {
    const conn = await resolveDb(db)
    const rows = await conn.select<Record<string, unknown>>(
      'SELECT * FROM business_jurisdictions WHERE isPrimary = 1 ORDER BY createdAt DESC LIMIT 1',
    )

    return rows[0] ? toJurisdictionRecord(rows[0]) : null
  },

  async updateInvoicePrefix(prefix: string, updatedAt: string, db?: Database) {
    const conn = await resolveDb(db)
    await conn.execute(
      'UPDATE settings SET invoicePrefix = ?, updatedAt = ? WHERE id = ?',
      [prefix, updatedAt, 'singleton'],
    )
  },

  async updateShippingTaxable(shippingTaxable: number, updatedAt: string, db?: Database) {
    const conn = await resolveDb(db)
    await conn.execute(
      'UPDATE settings SET shippingTaxable = ?, updatedAt = ? WHERE id = ?',
      [shippingTaxable, updatedAt, 'singleton'],
    )
  },

  async upsertPrimaryJurisdiction(
    input: { state: string; county: string; defaultTaxRate: number },
    db?: Database,
  ) {
    const conn = await resolveDb(db)

    const existing = await this.getPrimaryJurisdiction(conn)

    await conn.execute('UPDATE business_jurisdictions SET isPrimary = 0 WHERE isPrimary = 1')

    if (existing) {
      await conn.execute(
        'UPDATE business_jurisdictions SET state = ?, county = ?, defaultTaxRate = ?, isPrimary = 1 WHERE id = ?',
        [input.state, input.county, input.defaultTaxRate, existing.id],
      )

      return this.getJurisdictionById(existing.id, conn)
    }

    const id = crypto.randomUUID()
    const createdAt = new Date().toISOString()

    await conn.execute(
      `INSERT INTO business_jurisdictions (
         id, state, county, defaultTaxRate, isPrimary, createdAt
       ) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.state, input.county, input.defaultTaxRate, 1, createdAt],
    )

    return this.getJurisdictionById(id, conn)
  },

  async setPrimaryJurisdictionId(jurisdictionId: string | null, updatedAt: string, db?: Database) {
    const conn = await resolveDb(db)
    await conn.execute(
      'UPDATE settings SET primaryJurisdictionId = ?, updatedAt = ? WHERE id = ?',
      [jurisdictionId, updatedAt, 'singleton'],
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
