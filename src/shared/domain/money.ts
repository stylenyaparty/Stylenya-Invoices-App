export const round2 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100

export const assertNonNegative = (value: number, fieldName: string): void => {
  if (value < 0) {
    throw new Error(`${fieldName} cannot be negative`)
  }
}
