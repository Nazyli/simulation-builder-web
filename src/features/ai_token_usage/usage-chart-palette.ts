// CSS owns the palette so native charts and Recharts use the same semantic colors.
export const seriesColors = {
  input: 'var(--usage-input)',
  output: 'var(--usage-output)',
  total: 'var(--usage-total)',
}

export const categoryColors = [
  seriesColors.total,
  seriesColors.input,
  seriesColors.output,
  'var(--usage-category-four)',
  'var(--usage-category-five)',
]
