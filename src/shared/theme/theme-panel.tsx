import { useEffect, useId, useState } from 'react'
import { Palette, RotateCcw } from 'lucide-react'
import { Button } from '../../components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../../components/ui/sheet'
import { THEME_COLOR_KEYS, THEME_PRESETS, type ThemeColors } from './theme'
import { useTheme } from './use-theme'

const labels: Record<keyof ThemeColors, { title: string; description: string }> = {
  primary: { title: 'Primary', description: 'Main actions and brand color' },
  secondary: { title: 'Secondary', description: 'Supporting buttons and accents' },
  background: { title: 'Background', description: 'Page and workspace canvas' },
  surface: { title: 'Surface', description: 'Panels, tables, and dialogs' },
}

function ColorField({ colorKey }: { colorKey: keyof ThemeColors }) {
  const { colors, setColors } = useTheme()
  const id = useId()
  const [hex, setHex] = useState(colors[colorKey])
  const [invalid, setInvalid] = useState(false)
  const { title, description } = labels[colorKey]

  useEffect(() => {
    setHex(colors[colorKey])
    setInvalid(false)
  }, [colors, colorKey])

  function update(value: string) {
    setHex(value)
    const valid = /^#[\da-f]{6}$/i.test(value)
    setInvalid(!valid)
    if (valid) setColors({ ...colors, [colorKey]: value })
  }

  return (
    <div className="space-y-1">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <label htmlFor={`${id}-hex`} className="text-foreground text-xs font-medium">
            {title}
          </label>
          <p id={`${id}-description`} className="sr-only">
            {description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <input
            type="color"
            value={colors[colorKey]}
            aria-label={`${title} color`}
            aria-describedby={`${id}-description`}
            onChange={(event) => update(event.target.value)}
            className="border-input bg-card size-7 cursor-pointer rounded border p-0.5"
          />
          <input
            id={`${id}-hex`}
            value={hex}
            onChange={(event) => update(event.target.value)}
            onBlur={() => {
              if (invalid) {
                setHex(colors[colorKey])
                setInvalid(false)
              }
            }}
            aria-label={`${title} hex`}
            aria-invalid={invalid}
            aria-describedby={invalid ? `${id}-error` : `${id}-description`}
            spellCheck={false}
            maxLength={7}
            className="border-input bg-card text-card-foreground focus-visible:border-ring focus-visible:ring-ring/30 h-7 w-20 rounded border px-1.5 text-xs outline-none focus-visible:ring-2"
          />
        </div>
      </div>
      {invalid && (
        <p id={`${id}-error`} role="status" className="text-destructive text-[11px]">
          Use a six-digit hex color, such as #9929EA.
        </p>
      )}
    </div>
  )
}

export function ThemePanel() {
  const { colors, setColors, reset, persisted } = useTheme()
  const radioName = useId()
  const selected = THEME_PRESETS.find((preset) =>
    THEME_COLOR_KEYS.every((key) => preset.colors[key] === colors[key]),
  )?.name

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto shrink-0 gap-1.5"
          aria-label="Customize theme"
        >
          <Palette aria-hidden="true" className="size-4" />
          <span>Theme</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        density="compact"
        className="bg-card text-card-foreground overflow-y-auto"
        aria-label="Customize theme"
      >
        <SheetHeader className="border-border border-b">
          <SheetTitle>Customize theme</SheetTitle>
          <SheetDescription>
            Pick a palette or adjust four colors. Changes apply live.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-3 p-3">
          <fieldset className="space-y-1.5">
            <legend className="mb-0.5 text-xs font-semibold">
              Presets
              <span className="text-muted-foreground ml-1.5 text-[11px] font-normal">
                {THEME_PRESETS.length} palettes
              </span>
            </legend>
            <p className="text-muted-foreground mb-1.5 text-[11px]">
              Primary · Secondary · Background · Surface
            </p>
            <div className="max-h-[min(40dvh,20rem)] space-y-1 overflow-y-auto overscroll-contain p-0.5">
              {THEME_PRESETS.map((preset) => (
                <label
                  key={preset.name}
                  className="border-border hover:bg-muted has-[:checked]:border-ring has-[:checked]:bg-accent has-[:checked]:text-accent-foreground has-[:focus-visible]:outline-ring flex min-h-8 cursor-pointer items-center gap-2 rounded-md border px-2 py-1 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2"
                >
                  <input
                    type="radio"
                    name={radioName}
                    aria-label={`${preset.name} theme`}
                    checked={selected === preset.name}
                    onChange={() => setColors({ ...preset.colors })}
                    className="size-3 shrink-0 accent-[var(--primary)]"
                  />
                  <span className="min-w-0 flex-1 text-xs font-medium">{preset.name}</span>
                  <span className="flex shrink-0 gap-1" aria-hidden="true">
                    {THEME_COLOR_KEYS.map((key) => (
                      <span
                        key={key}
                        title={`${labels[key].title}: ${preset.colors[key]}`}
                        style={{ backgroundColor: preset.colors[key] }}
                        className="size-3.5 rounded-full border border-slate-300"
                      />
                    ))}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <section
            aria-labelledby={`${radioName}-custom`}
            className="border-border space-y-2 border-t pt-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 id={`${radioName}-custom`} className="text-xs font-semibold">
                Your colors
              </h2>
              {!selected && <span className="text-muted-foreground text-[11px]">Custom</span>}
            </div>
            {THEME_COLOR_KEYS.map((key) => (
              <ColorField key={key} colorKey={key} />
            ))}
          </section>
          <div className="border-border space-y-1.5 border-t pt-3">
            <Button variant="outline" onClick={reset} className="h-8 w-full gap-1.5 text-xs">
              <RotateCcw aria-hidden="true" className="size-3.5" />
              Reset to default
            </Button>
            <p className="text-muted-foreground text-[11px] leading-4" role="status">
              {persisted
                ? 'Saved in this browser. Text and interaction colors adapt automatically.'
                : 'Changes apply now, but this browser cannot save your theme.'}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
