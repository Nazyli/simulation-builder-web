import { Send } from 'lucide-react'
import type { FormEvent, KeyboardEvent } from 'react'

interface MessageComposerProps {
  target: string
  disabled: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onTyping: () => void
}

export function MessageComposer({ target, disabled, onSubmit, onTyping }: MessageComposerProps) {
  const canSend = Boolean(target) && !disabled
  return (
    <form
      onSubmit={onSubmit}
      className="bg-card flex min-w-0 flex-col gap-2 border-t border-slate-200 p-3"
    >
      <input type="hidden" name="target" value={target} />
      <div className="flex items-end gap-2">
        <textarea
          name="content"
          required
          disabled={!canSend}
          onChange={onTyping}
          onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              event.currentTarget.form?.requestSubmit()
            }
          }}
          placeholder={canSend ? `Message ${target}…` : 'Select a conversation to reply.'}
          className="focus:!border-primary focus:!ring-ring/20 !m-0 min-h-[44px] min-w-0 flex-1 resize-y rounded-md !border-slate-200 !bg-slate-50 !px-3 !py-2 text-sm text-slate-900 !shadow-none outline-none focus:!ring-2 disabled:!bg-slate-100"
        />
        <button
          type="submit"
          disabled={!canSend}
          className="!bg-primary !text-primary-foreground !m-0 !inline-flex shrink-0 items-center gap-1.5 rounded-md !border-0 !px-3.5 !py-2 text-sm font-semibold shadow-sm transition hover:!bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          <Send size={15} />
          Send
        </button>
      </div>
    </form>
  )
}
