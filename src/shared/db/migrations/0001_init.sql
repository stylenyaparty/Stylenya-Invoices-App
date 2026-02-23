CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  invoicePrefix TEXT NOT NULL DEFAULT 'INV',
  nextInvoiceSeq INTEGER NOT NULL DEFAULT 1,
  shippingTaxable INTEGER NOT NULL DEFAULT 1,
  primaryJurisdictionId TEXT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS business_jurisdictions (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  county TEXT NOT NULL,
  defaultTaxRate REAL NOT NULL DEFAULT 0,
  isPrimary INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  invoiceNumber TEXT NULL UNIQUE,
  invoiceDate TEXT NOT NULL,
  paymentStatus TEXT NOT NULL DEFAULT 'UNPAID',
  paymentDate TEXT NULL,
  paymentMethod TEXT NULL,
  fulfillmentMethod TEXT NOT NULL DEFAULT 'SHIP',
  shippingFee REAL NOT NULL DEFAULT 0,
  discountAmount REAL NOT NULL DEFAULT 0,
  taxRate REAL NOT NULL DEFAULT 0,
  shippingTaxable INTEGER NOT NULL DEFAULT 1,
  jurisdictionId TEXT NULL,
  taxableItemsSubtotalSnap REAL NOT NULL DEFAULT 0,
  nonTaxableItemsSubtotalSnap REAL NOT NULL DEFAULT 0,
  itemsSubtotalSnap REAL NOT NULL DEFAULT 0,
  discountAppliedToItemsSnap REAL NOT NULL DEFAULT 0,
  taxableItemsAfterDiscountSnap REAL NOT NULL DEFAULT 0,
  taxBaseSnap REAL NOT NULL DEFAULT 0,
  taxAmountSnap REAL NOT NULL DEFAULT 0,
  netItemsSalesSnap REAL NOT NULL DEFAULT 0,
  shippingRevenueSnap REAL NOT NULL DEFAULT 0,
  totalSnap REAL NOT NULL DEFAULT 0,
  approvedAt TEXT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id TEXT PRIMARY KEY,
  invoiceId TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  qty REAL NOT NULL,
  unitPrice REAL NOT NULL,
  isTaxable INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  FOREIGN KEY(invoiceId) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invoices_payment_date ON invoices(paymentDate);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
