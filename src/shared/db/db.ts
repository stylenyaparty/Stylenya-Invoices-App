import Database from '@tauri-apps/plugin-sql'

import initMigration from './migrations/0001_init.sql?raw'

const DB_URL = 'sqlite:stylenya_invoices.db'

let dbPromise: Promise<Database> | null = null
let initialized = false

const nowIso = () => new Date().toISOString()

const splitSqlStatements = (sql: string) =>
  sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean)

const runMigrations = async (db: Database) => {
  const statements = splitSqlStatements(initMigration)
  for (const statement of statements) {
    await db.execute(statement)
  }
}

const ensureSettingsSingleton = async (db: Database) => {
  const existing = await db.select<{ id: string }>(
    'SELECT id FROM settings WHERE id = ? LIMIT 1',
    ['singleton'],
  )

  if (existing.length === 0) {
    const now = nowIso()
    await db.execute(
      `INSERT INTO settings (
        id,
        invoicePrefix,
        nextInvoiceSeq,
        shippingTaxable,
        primaryJurisdictionId,
        createdAt,
        updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['singleton', 'INV', 1, 1, null, now, now],
    )
  }
}

export const getDb = async () => {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL)
  }

  const db = await dbPromise

  if (!initialized) {
    await runMigrations(db)
    await ensureSettingsSingleton(db)
    initialized = true
  }

  return db
}

export const withTransaction = async <T>(work: (db: Database) => Promise<T>) => {
  const db = await getDb()
  await db.execute('BEGIN')

  try {
    const result = await work(db)
    await db.execute('COMMIT')
    return result
  } catch (error) {
    await db.execute('ROLLBACK')
    throw error
  }
}
