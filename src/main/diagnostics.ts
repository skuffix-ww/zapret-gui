import * as tls from 'node:tls'
import type { PingAttempt, PingResult, PingTarget } from '@shared/types'

/**
 * TLS handshake is a meaningful DPI probe: reaches ClientHello→ServerHello,
 * so when DPI drops SNI/ClientHello the handshake stalls or fails — which is
 * exactly the symptom zapret fixes. Plain TCP connect can succeed even when
 * the handshake is censored, so it wouldn't differentiate "before/after".
 */
function handshakeOnce(host: string, port: number, timeoutMs: number): Promise<PingAttempt> {
  return new Promise((resolve) => {
    const start = performance.now()
    let done = false
    const finish = (a: PingAttempt): void => {
      if (done) return
      done = true
      try {
        socket.destroy()
      } catch {
        /* ignore */
      }
      resolve(a)
    }
    const socket = tls.connect({
      host,
      port,
      servername: host,
      // Some censored endpoints return a fake/invalid cert when blocked — we
      // still want to measure the handshake time, not cert validity.
      rejectUnauthorized: false,
      ALPNProtocols: ['h2', 'http/1.1']
    })
    const timer = setTimeout(() => finish({ ok: false, error: `timeout ${timeoutMs}ms` }), timeoutMs)
    socket.once('secureConnect', () => {
      clearTimeout(timer)
      finish({ ok: true, ms: Math.round(performance.now() - start) })
    })
    socket.once('error', (err: Error) => {
      clearTimeout(timer)
      finish({ ok: false, error: err.message })
    })
  })
}

export async function ping(target: PingTarget, attempts = 5, timeoutMs = 5000): Promise<PingResult> {
  const results: PingAttempt[] = []
  for (let i = 0; i < attempts; i++) {
    results.push(await handshakeOnce(target.host, target.port, timeoutMs))
  }
  const successes = results.filter((r) => r.ok && typeof r.ms === 'number').map((r) => r.ms!)
  return {
    target,
    attempts: results,
    min: successes.length ? Math.min(...successes) : null,
    max: successes.length ? Math.max(...successes) : null,
    avg: successes.length ? Math.round(successes.reduce((a, b) => a + b, 0) / successes.length) : null,
    successRate: results.length ? successes.length / results.length : 0
  }
}
