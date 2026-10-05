export interface ChatBubbleInput {
  content: string
  timestamp: string
}

export class ChatBatchBuffer {
  private bubbles: ChatBubbleInput[] = []
  private timer: ReturnType<typeof setTimeout> | null = null
  private readonly delayMs: number
  private readonly onFlush: (bubbles: ChatBubbleInput[]) => void

  constructor(delayMs: number, onFlush: (bubbles: ChatBubbleInput[]) => void) {
    this.delayMs = delayMs
    this.onFlush = onFlush
  }

  get size() {
    return this.bubbles.length
  }

  enqueue(bubble: ChatBubbleInput) {
    this.bubbles.push(bubble)
    this.resetTimer()
  }

  noteTyping() {
    if (this.bubbles.length) this.resetTimer()
  }

  flush() {
    this.clearTimer()
    if (!this.bubbles.length) return
    const batch = this.bubbles
    this.bubbles = []
    this.onFlush(batch)
  }

  dispose() {
    this.flush()
  }

  private resetTimer() {
    this.clearTimer()
    this.timer = setTimeout(() => this.flush(), this.delayMs)
  }

  private clearTimer() {
    if (this.timer !== null) clearTimeout(this.timer)
    this.timer = null
  }
}

const viteEnv = (import.meta as ImportMeta & { env?: { VITE_SEND_CHAT_TIMER?: string } }).env
const configuredSeconds = Number(viteEnv?.VITE_SEND_CHAT_TIMER ?? 8)
export const sendChatTimerMs =
  Number.isFinite(configuredSeconds) && configuredSeconds > 0 ? configuredSeconds * 1000 : 8000
