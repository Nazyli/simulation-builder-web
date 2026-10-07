import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  description,
  eyebrow,
  metadata,
  actions,
  className,
  inset = false,
}: {
  title: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  metadata?: ReactNode
  actions?: ReactNode
  className?: string
  inset?: boolean
}) {
  return (
    <header
      className={cn(
        'app-page-header flex min-w-0 flex-wrap items-center justify-between gap-3',
        inset && 'px-[var(--page-inset)] py-[var(--page-gap)]',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold tracking-[0.08em] text-[var(--color-canvas-brand-text)] uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="min-w-0 text-[20px] leading-tight font-semibold tracking-[-0.02em] break-words text-[var(--color-canvas-heading)] max-[620px]:text-[18px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-[72ch] text-sm leading-relaxed break-words text-[var(--color-canvas-text-muted)]">
            {description}
          </p>
        )}
        {metadata && (
          <div className="mt-2 flex max-w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-canvas-text-muted)]">
            {metadata}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex w-full max-w-full min-w-0 shrink-0 flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end [&>*]:max-w-full [&>*]:min-w-0 [&>*]:shrink [&>*]:whitespace-normal">
          {actions}
        </div>
      )}
    </header>
  )
}
