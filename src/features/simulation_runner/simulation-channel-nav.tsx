import { NavLink } from 'react-router-dom'
import { channelNavigation, channelPath } from './simulation-channels'
import { useSimulationRun } from './simulation-run-context-core'

export function SimulationChannelNav() {
  const { participantId, unreadCounts } = useSimulationRun()
  return (
    <nav
      aria-label="Simulation channels"
      className="bg-card flex max-w-full min-w-0 shrink-0 items-start gap-1 overflow-x-auto rounded-lg border border-slate-200 p-1.5 lg:w-12 lg:flex-col lg:overflow-visible"
    >
      {channelNavigation.map(({ channel, label, icon: Icon }) => {
        const unread = unreadCounts[channel] ?? 0
        return (
          <NavLink
            key={channel}
            to={channelPath(participantId, channel)}
            title={label}
            aria-label={label}
            className={({ isActive }) =>
              `focus-visible:ring-ring relative !m-0 grid size-9 shrink-0 place-items-center rounded-md !border-0 transition focus-visible:ring-2 focus-visible:outline-none lg:w-full ${isActive ? '!bg-accent !text-accent-foreground' : '!bg-transparent !text-slate-600 hover:!bg-slate-100 hover:!text-slate-900'}`
            }
          >
            <Icon size={18} />
            {unread > 0 && (
              <span
                aria-label={`${unread} unread item${unread === 1 ? '' : 's'}`}
                className="bg-primary text-primary-foreground absolute -top-1 -right-1 grid min-w-[18px] place-items-center rounded-md px-1 text-[10px] leading-4 font-bold"
              >
                {unread}
              </span>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
