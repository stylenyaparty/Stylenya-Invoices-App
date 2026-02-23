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

export interface PrimaryJurisdiction {
  id: string
  state: string
  county: string
  defaultTaxRate: number
  isPrimary: boolean
  createdAt: string
}

export interface SettingsView {
  settings: AppSettings
  primaryJurisdiction: PrimaryJurisdiction | null
}

const nowIso = () => new Date().toISOString()

const toDomain = (settings: Awaited<ReturnType<typeof settingsRepository.getSettings>>): AppSettings => ({
  ...settings,
  shippingTaxable: settings.shippingTaxable === 1,
})

const toJurisdictionDomain = (
  jurisdiction: Awaited<ReturnType<typeof settingsRepository.getPrimaryJurisdiction>>,
): PrimaryJurisdiction | null => {
  if (!jurisdiction) {
    return null
  }

  return {
    ...jurisdiction,
    isPrimary: jurisdiction.isPrimary === 1,
  }
}

export const settingsService = {
  async getOrCreateSettings(): Promise<AppSettings> {
    const settings = await settingsRepository.getSettings()
    return toDomain(settings)
  },

  async getSettingsView(): Promise<SettingsView> {
    const [settings, primaryJurisdiction] = await Promise.all([
      settingsRepository.getSettings(),
      settingsRepository.getPrimaryJurisdiction(),
    ])

    return {
      settings: toDomain(settings),
      primaryJurisdiction: toJurisdictionDomain(primaryJurisdiction),
    }
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

  async saveSettings(input: {
    invoicePrefix: string
    shippingTaxable: boolean
    state: string
    county: string
    defaultTaxRate: number
  }): Promise<SettingsView> {
    const invoicePrefix = input.invoicePrefix.trim().toUpperCase()
    const state = input.state.trim()
    const county = input.county.trim()

    if (!invoicePrefix) {
      throw new Error('Invoice prefix is required')
    }
    if (!state) {
      throw new Error('State is required')
    }
    if (!county) {
      throw new Error('County is required')
    }
    if (input.defaultTaxRate < 0) {
      throw new Error('Tax rate must be non-negative')
    }

    await withTransaction(async (db) => {
      const updatedAt = nowIso()
      await settingsRepository.updateInvoicePrefix(invoicePrefix, updatedAt, db)
      await settingsRepository.updateShippingTaxable(input.shippingTaxable ? 1 : 0, updatedAt, db)

      const jurisdiction = await settingsRepository.upsertPrimaryJurisdiction(
        { state, county, defaultTaxRate: input.defaultTaxRate },
        db,
      )

      await settingsRepository.setPrimaryJurisdictionId(jurisdiction?.id ?? null, updatedAt, db)
    })

    return this.getSettingsView()
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
