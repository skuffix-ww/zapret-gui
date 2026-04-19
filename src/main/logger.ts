import { EventEmitter } from 'node:events'
import type { LogEntry, LogLevel } from '@shared/types'

const MAX_BUFFER = 2000
let counter = 0

class Logger extends EventEmitter {
  private buf: LogEntry[] = []

  push(level: LogLevel, message: string): LogEntry {
    const entry: LogEntry = {
      id: ++counter,
      ts: Date.now(),
      level,
      message: message.replace(/\r/g, '').replace(/\u001b\[[0-9;]*m/g, '')
    }
    this.buf.push(entry)
    if (this.buf.length > MAX_BUFFER) this.buf.splice(0, this.buf.length - MAX_BUFFER)
    this.emit('entry', entry)
    return entry
  }

  info(m: string): void {
    this.push('info', m)
  }
  warn(m: string): void {
    this.push('warn', m)
  }
  error(m: string): void {
    this.push('error', m)
  }
  debug(m: string): void {
    this.push('debug', m)
  }

  snapshot(): LogEntry[] {
    return [...this.buf]
  }

  clear(): void {
    this.buf = []
    this.emit('cleared')
  }
}

export const logger = new Logger()
