import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export type PageFrameMode = 'workbench' | 'operations' | 'reference'
export type PageFrameDensity = 'compact' | 'comfortable'

export type PageFrameViewport = 'content' | 'fill' | 'minimum'

export function PageFrame({
  children,
  className,
  mode = 'operations',
  density = 'compact',
  edgeToEdge = false,
  viewport = 'minimum',
}: {
  children: ReactNode
  className?: string
  mode?: PageFrameMode
  density?: PageFrameDensity
  edgeToEdge?: boolean
  viewport?: PageFrameViewport
}) {
  return (
    <div
      data-page-mode={mode}
      data-page-viewport={viewport}
      data-edge-to-edge={edgeToEdge || undefined}
      className={cn(
        'app-page-frame flex w-full max-w-none min-w-0 flex-col bg-[var(--color-canvas)]',
        edgeToEdge ? 'gap-0 p-0' : 'gap-[var(--page-gap)] p-[var(--page-inset)]',
        density === 'compact' && 'app-density-compact',
        viewport === 'fill' && 'h-[var(--page-viewport-height)] min-h-0 overflow-hidden',
        viewport === 'minimum' && 'min-h-[var(--page-viewport-height)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Padded content inside a full-bleed canvas or tabbed workspace. */
export function PageContent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'app-page-content flex min-w-0 flex-col gap-[var(--page-gap)] p-[var(--page-inset)]',
        className,
      )}
    >
      {children}
    </div>
  )
}
