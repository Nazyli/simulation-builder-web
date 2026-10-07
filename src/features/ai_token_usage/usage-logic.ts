import type { CurrencyAmount } from './usage-types'

export function formatTokenCount(value: number, compact = false): string {
  if (!compact || Math.abs(value) < 10_000) {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
  }
  const absolute = Math.abs(value)
  const scaled = absolute >= 1_000_000 ? value / 1_000_000 : value / 1_000
  const suffix = absolute >= 1_000_000 ? 'M' : 'K'
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(scaled)}${suffix}`
}

export function formatCurrencyAmounts(amounts: CurrencyAmount[]): string[] {
  return amounts.map(({ currency, amount }) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 12,
      }).format(amount)
    } catch {
      return `${currency} ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 12 }).format(amount)}`
    }
  })
}
