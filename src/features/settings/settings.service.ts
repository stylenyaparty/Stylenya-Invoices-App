import type Database from '@tauri-apps/plugin-sql'

import { withTransaction } from '../../shared/db'
import { settingsRepository } from './settings.repository'

export interface AppSettings {
  id: 'singleton'
  invoicePrefix: string
  nextInvoiceSeq: number
  shippingTaxable: boolean
  primaryJurisdictionId: string | null
  createdAt: string
  updatedAt: string
}

const nowIso = () => new Date().toISOString()

const toDomain = (settings: Awaited<ReturnType<typeof settingsRepository.getSettings>>): AppSettings => ({
  ...settings,
  shippingTaxable: settings.shippingTaxable === 1,
})

export const settingsService = {
  async getOrCreateSettings(): Promise<AppSettings> {
    const settings = await settingsRepository.getSettings()
    return toDomain(settings)
  },

  async updateInvoicePrefix(prefix: string): Promise<AppSettings> {
    const normalized = prefix.trim().toUpperCase()
    if (!normalized) {
      throw new Error('Invoice prefix is required')
    }

    const updatedAt = nowIso()
    await settingsRepository.updateInvoicePrefix(normalized, updatedAt)

    return this.getOrCreateSettings()
  },

  async getNextInvoiceNumberAndIncrement(db?: Database): Promise<string> {
    const runner = async (txDb: Database) => {
      const settings = await settingsRepository.getSettings(txDb)
      const seq = settings.nextInvoiceSeq
      const invoiceNumber = `${settings.invoicePrefix}-${seq.toString().padStart(6, '0')}`
      await settingsRepository.incrementInvoiceSeq(seq + 1, nowIso(), txDb)
      return invoiceNumber
    }

    return db ? runner(db) : withTransaction(runner)
  },
}
