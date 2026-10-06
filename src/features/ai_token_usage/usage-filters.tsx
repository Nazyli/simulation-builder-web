import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import type { UsageFilters } from './usage-types'

type UsageOptionKey = 'simulationId' | 'provider' | 'model' | 'activityType'

const filterFields: { key: UsageOptionKey; label: string }[] = [
  { key: 'simulationId', label: 'Simulation' },
  { key: 'provider', label: 'Provider' },
  { key: 'model', label: 'Model' },
  { key: 'activityType', label: 'Activity type' },
]

export function UsageFiltersBar({
  filters,
  options,
  onChange,
  onClear,
}: {
  filters: UsageFilters
  options: Record<UsageOptionKey, string[]>
  onChange: (filters: UsageFilters) => void
  onClear: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const hasFilters = Object.values(filters).some(Boolean)
  return (
    <section
      className="usage-filters min-w-0 border-y border-slate-200 py-3"
      aria-label="Filter usage"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <SlidersHorizontal aria-hidden="true" className="size-3.5" />
          Filter usage{' '}
          <span className="usage-filter-scope">
            {hasFilters ? `${Object.values(filters).filter(Boolean).length} active` : 'All records'}
          </span>
        </h2>
        <div className="flex items-center gap-1">
          {hasFilters && (
            <Button type="button" variant="ghost" size="xs" onClick={onClear}>
              Clear filters
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="sm:hidden"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? 'Hide' : 'Show'} filters
          </Button>
        </div>
      </div>
      <div
        className={`${expanded ? 'grid' : 'hidden'} usage-filters__fields grid-cols-2 gap-2 sm:grid sm:grid-cols-3 xl:grid-cols-7`}
      >
        <label className="grid min-w-0 gap-1 text-[11px] font-medium text-slate-600">
          Date from
          <Input
            type="date"
            aria-label="Date from"
            value={filters.from ?? ''}
            onChange={(event) =>
              onChange({ ...filters, from: event.currentTarget.value || undefined })
            }
            className="h-8 min-w-0 text-xs"
          />
        </label>
        <label className="grid min-w-0 gap-1 text-[11px] font-medium text-slate-600">
          Date to
          <Input
            type="date"
            aria-label="Date to"
            value={filters.to ?? ''}
            onChange={(event) =>
              onChange({ ...filters, to: event.currentTarget.value || undefined })
            }
            className="h-8 min-w-0 text-xs"
          />
        </label>
        <label className="grid min-w-0 gap-1 text-[11px] font-medium text-slate-600">
          Participant ID
          <Input
            aria-label="Participant ID"
            placeholder="Enter exact ID"
            value={filters.participantId ?? ''}
            onChange={(event) =>
              onChange({ ...filters, participantId: event.currentTarget.value || undefined })
            }
            className="h-8 min-w-0 text-xs"
          />
        </label>
        {filterFields.map(({ key, label }) => (
          <label key={key} className="grid min-w-0 gap-1 text-[11px] font-medium text-slate-600">
            {label}
            <Select
              value={filters[key] || 'all'}
              onValueChange={(value) =>
                onChange({ ...filters, [key]: value === 'all' ? undefined : value })
              }
            >
              <SelectTrigger
                aria-label={label}
                className="usage-select-trigger w-full min-w-0"
                data-active={Boolean(filters[key])}
              >
                <SelectValue placeholder={`All ${label.toLowerCase()}s`} />
              </SelectTrigger>
              <SelectContent
                className="usage-select-menu"
                position="popper"
                align="start"
                sideOffset={4}
              >
                <SelectGroup>
                  <SelectLabel>{label}</SelectLabel>
                  <SelectItem value="all">All {label.toLowerCase()}s</SelectItem>
                  {options[key].length > 0 && <SelectSeparator />}
                  {options[key].map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
        ))}
      </div>
      {!expanded && hasFilters && (
        <p className="mt-1 truncate text-[11px] text-slate-500 sm:hidden">
          Active filters are applied. Open filters to review or clear them.
        </p>
      )}
    </section>
  )
}
