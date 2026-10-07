export interface ThemeColors {
  primary: string
  secondary: string
  background: string
  surface: string
}

export const THEME_COLOR_KEYS = ['primary', 'secondary', 'background', 'surface'] as const
export const THEME_STORAGE_KEY = 'simulation-builder.theme.v1'

export const DEFAULT_THEME: Readonly<ThemeColors> = {
  primary: '#9929EA',
  secondary: '#DBABFF',
  background: '#F6F8FB',
  surface: '#FFFFFF',
}

export const THEME_PRESETS = [
  { name: 'Default', colors: DEFAULT_THEME },
  {
    name: 'Ocean',
    colors: { primary: '#2563EB', secondary: '#3B82F6', background: '#F8FAFC', surface: '#FFFFFF' },
  },
  {
    name: 'Teal',
    colors: { primary: '#0D9488', secondary: '#14B8A6', background: '#F0FDFA', surface: '#FFFFFF' },
  },
  {
    name: 'Indigo',
    colors: { primary: '#6366F1', secondary: '#818CF8', background: '#F5F3FF', surface: '#FFFFFF' },
  },
  {
    name: 'Emerald',
    colors: { primary: '#059669', secondary: '#10B981', background: '#ECFDF5', surface: '#FFFFFF' },
  },
  {
    name: 'Rose',
    colors: { primary: '#E11D48', secondary: '#FB7185', background: '#FFF1F2', surface: '#FFFFFF' },
  },
  {
    name: 'Slate',
    colors: { primary: '#334155', secondary: '#475569', background: '#F8FAFC', surface: '#FFFFFF' },
  },
  {
    name: 'Amber',
    colors: { primary: '#D97706', secondary: '#F59E0B', background: '#FFFBEB', surface: '#FFFFFF' },
  },
  {
    name: 'Orange',
    colors: { primary: '#EA580C', secondary: '#FB923C', background: '#FFF7ED', surface: '#FFFFFF' },
  },
  {
    name: 'Coral',
    colors: { primary: '#E76F51', secondary: '#F4A261', background: '#FFF5F0', surface: '#FFFCFA' },
  },
  {
    name: 'Ruby',
    colors: { primary: '#B91C1C', secondary: '#EF4444', background: '#FEF2F2', surface: '#FFFFFF' },
  },
  {
    name: 'Pink',
    colors: { primary: '#EC4899', secondary: '#F472B6', background: '#FDF2F8', surface: '#FFFFFF' },
  },
  {
    name: 'Sky',
    colors: { primary: '#0284C7', secondary: '#38BDF8', background: '#F0F9FF', surface: '#FFFFFF' },
  },
  {
    name: 'Mint',
    colors: { primary: '#0F766E', secondary: '#5EEAD4', background: '#F0FDFA', surface: '#F7FFFC' },
  },
  {
    name: 'Olive',
    colors: { primary: '#4D7C0F', secondary: '#A3E635', background: '#F7FEE7', surface: '#FFFFF5' },
  },
  {
    name: 'Sand',
    colors: { primary: '#A16207', secondary: '#D6B77C', background: '#FAF7F0', surface: '#FFFDF7' },
  },
  {
    name: 'Coffee',
    colors: { primary: '#92400E', secondary: '#B45309', background: '#FEF3C7', surface: '#FFFBEB' },
  },
  {
    name: 'Midnight',
    colors: { primary: '#60A5FA', secondary: '#38BDF8', background: '#0F172A', surface: '#1E293B' },
  },
  {
    name: 'Charcoal',
    colors: { primary: '#FBBF24', secondary: '#F59E0B', background: '#18181B', surface: '#27272A' },
  },
  {
    name: 'Forest Night',
    colors: { primary: '#34D399', secondary: '#2DD4BF', background: '#062C24', surface: '#103D32' },
  },
  {
    name: 'Material Palenight',
    colors: { primary: '#C792EA', secondary: '#89DDFF', background: '#292D3E', surface: '#34324A' },
  },
] satisfies Array<{ name: string; colors: Readonly<ThemeColors> }>

type ThemeStorage = Pick<Storage, 'getItem' | 'setItem'>

// Retain Tailwind's incumbent slate ramp until the surface itself changes.
const SLATE_DEFAULTS = [
  'oklch(98.4% 0.003 247.858)',
  'oklch(96.8% 0.007 247.896)',
  'oklch(92.9% 0.013 255.508)',
  'oklch(86.9% 0.022 252.894)',
  'oklch(70.4% 0.04 256.788)',
  'oklch(55.4% 0.046 257.417)',
  'oklch(44.6% 0.043 257.281)',
  'oklch(37.2% 0.044 257.287)',
  'oklch(27.9% 0.041 260.031)',
  'oklch(20.8% 0.042 265.755)',
  'oklch(12.9% 0.042 264.695)',
]

export function normalizeTheme(value: unknown): ThemeColors | null {
  if (!value || typeof value !== 'object') return null
  const colors = value as Record<string, unknown>
  if (
    !THEME_COLOR_KEYS.every(
      (key) => typeof colors[key] === 'string' && /^#[\da-f]{6}$/i.test(colors[key] as string),
    )
  )
    return null
  return Object.fromEntries(
    THEME_COLOR_KEYS.map((key) => [key, (colors[key] as string).toUpperCase()]),
  ) as unknown as ThemeColors
}

export function readTheme(storage: Pick<ThemeStorage, 'getItem'> | null): ThemeColors {
  try {
    const saved = JSON.parse(storage?.getItem(THEME_STORAGE_KEY) ?? 'null')
    if (saved?.version === 1) return normalizeTheme(saved.colors) ?? { ...DEFAULT_THEME }
  } catch {
    /* Invalid data or denied storage uses the original palette. */
  }
  return { ...DEFAULT_THEME }
}

export function saveTheme(storage: ThemeStorage | null, colors: ThemeColors): boolean {
  const normalized = normalizeTheme(colors)
  if (!storage || !normalized) return false
  try {
    storage.setItem(THEME_STORAGE_KEY, JSON.stringify({ version: 1, colors: normalized }))
    return true
  } catch {
    return false
  }
}

export function browserThemeStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function rgb(hex: string): number[] {
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16))
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((channel) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return r * 0.2126 + g * 0.7152 + b * 0.0722
}

export function contrastRatio(a: string, b: string): number {
  const first = luminance(a)
  const second = luminance(b)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

function foreground(background: string, preferred = '#172033'): string {
  if (contrastRatio(background, preferred) >= 4.5) return preferred
  return contrastRatio(background, '#FFFFFF') >= contrastRatio(background, '#000000')
    ? '#FFFFFF'
    : '#000000'
}

function mix(base: string, target: string, fraction: number): string {
  const targetRgb = rgb(target)
  return `#${rgb(base)
    .map((channel, index) =>
      Math.round(channel + (targetRgb[index] - channel) * fraction)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
    .toUpperCase()}`
}

function contrastingColor(color: string, background: string, minimum: number): string {
  const target = foreground(background)
  for (let step = 0; step <= 20; step++) {
    const candidate = mix(color, target, step / 20)
    if (contrastRatio(candidate, background) >= minimum) return candidate
  }
  return target
}

export function deriveThemeTokens(colors: ThemeColors): Record<string, string> {
  const { primary, secondary, background, surface } = normalizeTheme(colors) ?? DEFAULT_THEME
  const ink = foreground(surface)
  const canvasInk = foreground(background)
  const defaultSurface = surface === DEFAULT_THEME.surface
  const defaultBrand = primary === DEFAULT_THEME.primary
  const accent = defaultBrand && defaultSurface ? '#F5E7FF' : mix(surface, primary, 0.1)
  const muted = defaultSurface ? '#F8FAFC' : mix(surface, ink, 0.04)
  const textMuted = defaultSurface
    ? '#64748B'
    : contrastingColor(mix(surface, ink, 0.6), surface, 4.5)
  const border = defaultSurface ? '#DBE3EC' : mix(surface, ink, 0.2)
  const controlBorder = defaultSurface ? 'oklch(0.922 0 0)' : border
  const primaryForeground = foreground(primary, '#FFFFFF')
  const hoverCandidate = mix(primary, primaryForeground === '#FFFFFF' ? '#000000' : '#FFFFFF', 0.16)
  const hover = defaultBrand ? '#7D1FC2' : hoverCandidate
  return {
    '--primary': primary,
    '--primary-text': contrastingColor(primary, surface, 4.5),
    '--primary-foreground': primaryForeground,
    '--secondary': secondary,
    '--secondary-foreground': foreground(secondary, '#3B0A5C'),
    '--color-canvas': background,
    '--color-canvas-foreground': canvasInk,
    '--color-canvas-heading': foreground(background, '#0F172A'),
    '--color-canvas-brand-text': contrastingColor(primary, background, 4.5),
    '--color-canvas-text-muted': contrastingColor('#64748B', background, 4.5),
    '--color-graph-accent': contrastingColor(primary, background, 3),
    '--color-chart-input': contrastingColor(mix(primary, surface, 0.35), surface, 3),
    '--color-chart-output': contrastingColor(mix(secondary, primary, 0.25), surface, 3),
    '--color-chart-total': contrastingColor(primary, surface, 3),
    '--color-chart-category-four': contrastingColor('#64748B', surface, 3),
    '--color-chart-category-five': contrastingColor('#B45309', surface, 3),
    ...Object.fromEntries(
      [0.06, 0.14, 0.24, 0.38].flatMap((strength, index) => {
        const fill = mix(surface, primary, strength)
        return [
          [`--color-activity-${index + 1}`, fill],
          [`--color-activity-${index + 1}-foreground`, foreground(fill)],
        ]
      }),
    ),
    '--color-surface': surface,
    '--color-surface-muted': muted,
    '--color-header':
      background === DEFAULT_THEME.background && defaultSurface
        ? '#FBFCFE'
        : mix(surface, background, 0.5),
    '--color-graph':
      background === DEFAULT_THEME.background && defaultSurface ? '#FBFCFE' : background,
    '--color-text': ink,
    '--color-text-muted': textMuted,
    '--color-border': border,
    '--color-border-strong': defaultSurface ? '#C6D2DF' : mix(surface, ink, 0.32),
    '--color-brand-primary': primary,
    '--color-brand-secondary': secondary,
    '--color-primary': primary,
    '--color-primary-hover': hover,
    '--background': surface,
    '--foreground': defaultSurface ? 'oklch(0.145 0 0)' : ink,
    '--card': surface,
    '--card-foreground': ink,
    '--popover': surface,
    '--popover-foreground': ink,
    '--muted': defaultSurface ? 'oklch(0.97 0 0)' : muted,
    '--muted-foreground': defaultSurface ? 'oklch(0.556 0 0)' : textMuted,
    '--accent': accent,
    '--accent-foreground':
      defaultBrand && defaultSurface ? '#5B148F' : contrastingColor(primary, accent, 4.5),
    '--border': controlBorder,
    '--input': controlBorder,
    '--ring': contrastingColor(primary, surface, 3),
    '--sidebar': defaultSurface ? 'oklch(0.985 0 0)' : muted,
    '--sidebar-foreground': defaultSurface ? 'oklch(0.145 0 0)' : ink,
    '--sidebar-primary': primary,
    '--sidebar-primary-foreground': primaryForeground,
    '--sidebar-accent': accent,
    '--sidebar-accent-foreground':
      defaultBrand && defaultSurface ? '#5B148F' : contrastingColor(primary, accent, 4.5),
    '--sidebar-border': controlBorder,
    '--sidebar-ring': contrastingColor(primary, surface, 3),
    ...Object.fromEntries(
      [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((level, index) => [
        `--color-slate-${level}`,
        defaultSurface
          ? SLATE_DEFAULTS[index]
          : contrastingColor(
              mix(
                surface,
                ink,
                [0.02, 0.04, 0.12, 0.2, 0.5, 0.65, 0.75, 0.82, 0.88, 0.94, 0.98][index],
              ),
              surface,
              level >= 400 ? 4.5 : 1,
            ),
      ]),
    ),
  }
}

export function applyTheme(
  style: Pick<CSSStyleDeclaration, 'setProperty'>,
  colors: ThemeColors,
): void {
  for (const [key, value] of Object.entries(deriveThemeTokens(colors)))
    style.setProperty(key, value)
}
