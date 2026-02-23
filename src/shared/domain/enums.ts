export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
}

export enum PaymentMethod {
  ZELLE = 'ZELLE',
  CASH = 'CASH',
  CARD = 'CARD',
  PAYPAL = 'PAYPAL',
}

export enum FulfillmentMethod {
  SHIP = 'SHIP',
  PICKUP = 'PICKUP',
}
