import { useState } from 'react'
import type { AiUsageTrendPoint } from '../../shared/api/ai-token-usage'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'

export function RequestActivityChart({ data }: { data: AiUsageTrendPoint[] }) {
  const months = [...new Set(data.map((point) => point.date.slice(0, 7)))].sort().reverse()
  const [selection, setSelection] = useState('')
  const month = months.includes(selection) ? selection : months[0]
  const rows = data.filter((point) => point.date.startsWith(month ?? ''))
  const requests = new Map(rows.map((point) => [point.date, point.requestCount]))
  const total = rows.reduce((sum, point) => sum + point.requestCount, 0)
  const activeDays = rows.filter((point) => point.requestCount > 0).length
  const peak = Math.max(0, ...rows.map((point) => point.requestCount))
  const start = month ? new Date(`${month}-01T00:00:00Z`) : null
  const offset = start ? (start.getUTCDay() + 6) % 7 : 0
  const days = start
    ? new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate()
    : 0
  const label = (value: string) =>
    new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
      new Date(`${value}-01T00:00:00Z`),
    )
  return (
    <section className="usage-chart usage-activity" aria-label="Request activity">
      <div className="usage-activity__heading">
        <h3>Request activity</h3>
        {month &&
          (months.length > 1 ? (
            <Select value={month} onValueChange={setSelection}>
              <SelectTrigger className="usage-select-trigger" aria-label="Activity month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="usage-select-menu" position="popper" align="end">
                {months.map((value) => (
                  <SelectItem key={value} value={value}>
                    {label(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span>{label(month)}</span>
          ))}
      </div>
      <p className="mt-0 text-xs text-slate-500">Recorded AI requests per day · WIB</p>
      {month ? (
        <>
          <div className="usage-activity__calendar">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <span className="usage-activity__weekday" key={day}>
                {day}
              </span>
            ))}
            {Array.from({ length: offset }, (_, index) => (
              <span key={`blank-${index}`} aria-hidden="true" />
            ))}
            {Array.from({ length: days }, (_, index) => {
              const day = index + 1
              const date = `${month}-${String(day).padStart(2, '0')}`
              const count = requests.get(date) ?? 0
              const level = count ? Math.max(1, Math.ceil((count / peak) * 4)) : 0
              return (
                <div
                  className="usage-activity__day"
                  data-level={level}
                  key={date}
                  title={`${date}: ${count.toLocaleString('en-US')} recorded requests`}
                  aria-label={`${date}: ${count.toLocaleString('en-US')} recorded requests`}
                >
                  <span aria-hidden="true">{day}</span>
                  <strong aria-hidden="true">{count || '—'}</strong>
                </div>
              )
            })}
          </div>
          <div className="usage-activity__legend">
            <span>Fewer</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <i
                className="usage-activity__day"
                data-level={level}
                key={level}
                aria-hidden="true"
              />
            ))}
            <span>More requests</span>
          </div>
          <p className="usage-activity__summary">
            {total.toLocaleString('en-US')} requests · {activeDays} active days · Peak{' '}
            {peak.toLocaleString('en-US')} / day
          </p>
        </>
      ) : (
        <p className="py-12 text-center text-xs text-slate-500">No recorded request activity.</p>
      )}
    </section>
  )
}
