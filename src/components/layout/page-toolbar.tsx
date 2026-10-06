import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function PageToolbar({
  children,
  className,
  inset = false,
}: {
  children: ReactNode
  className?: string
  inset?: boolean
}) {
  return (
    <div
      className={cn(
        'flex w-full max-w-full min-w-0 flex-wrap items-center gap-2 [&>*]:max-w-full [&>*]:min-w-0 [&>*]:shrink [&>*]:whitespace-normal',
        inset && 'px-[var(--page-inset)] pb-[var(--page-gap)]',
        className,
      )}
    >
      {children}
    </div>
  )
}
