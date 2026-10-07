import type { DimensionUsage } from './usage-types'

export function simulationShares(data: DimensionUsage[]) {
  const ordered = [...data].sort(
    (left, right) => right.totalTokens - left.totalTokens || left.id.localeCompare(right.id),
  )
  const total = ordered.reduce((sum, row) => sum + row.totalTokens, 0)
  const groups =
    ordered.length > 5
      ? [
          ...ordered.slice(0, 4),
          {
            id: 'grouped-other-simulations',
            label: `Other (${ordered.length - 4})`,
            totalTokens: ordered.slice(4).reduce((sum, row) => sum + row.totalTokens, 0),
          },
        ]
      : ordered
  let offset = 0
  return groups.map((row) => {
    const percent = total ? (row.totalTokens / total) * 100 : 0
    const segment = {
      id: row.id,
      label: row.label,
      tokens: row.totalTokens,
      percent,
      offset,
    }
    offset += percent
    return segment
  })
}
