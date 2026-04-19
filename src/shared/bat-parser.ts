import type { ArgEntry, Profile, StrategySection } from './types'

const TOKEN_RE = /"([^"]*)"|(\S+)/g
const CONTINUATION_MARKER = '___ZAPRET_LINE_CONTINUATION___'
const BIN_PLACEHOLDER = '${BIN}'
const LISTS_PLACEHOLDER = '${LISTS}'

export interface ParsedBat {
  name: string
  globalArgs: ArgEntry[]
  sections: StrategySection[]
  /** Lines before the winws.exe invocation (comments, echo, etc.) — preserved for round-tripping. */
  preamble: string
  notRecommended: boolean
}

/**
 * Flowseal .bat files end each continued line with a caret (^), then newline.
 * We join those into a single logical command line, then tokenize.
 */
export function parseBat(raw: string, fallbackName = 'Imported'): ParsedBat {
  const text = raw.replace(/\r\n?/g, '\n')
  const preambleLines: string[] = []
  const contentLines: string[] = []
  let seenWinws = false
  let notRecommended = false

  for (const line of text.split('\n')) {
    if (/::\s*NOT RECOMMENDED/i.test(line)) notRecommended = true
    if (!seenWinws) {
      if (/winws\.exe/i.test(line)) {
        seenWinws = true
        contentLines.push(line)
      } else {
        preambleLines.push(line)
      }
    } else {
      contentLines.push(line)
    }
  }

  const joined = contentLines
    .map((l) => l.replace(/\s*\^\s*$/, ` ${CONTINUATION_MARKER} `))
    .join(' ')
    .replace(new RegExp(CONTINUATION_MARKER, 'g'), '')

  // Strip everything before winws.exe (including `start "..." /min "...winws.exe"`).
  const winwsIdx = joined.toLowerCase().indexOf('winws.exe')
  const afterWinws = winwsIdx >= 0 ? joined.slice(winwsIdx + 'winws.exe'.length) : joined
  // Drop possible closing quote from "...winws.exe"
  const trimmed = afterWinws.replace(/^"/, '').trim()

  const tokens = tokenize(trimmed)
  const normalizedTokens = tokens.map(normalizeToken)

  const chunks: string[][] = [[]]
  for (const tok of normalizedTokens) {
    if (tok === '--new') chunks.push([])
    else chunks[chunks.length - 1]!.push(tok)
  }

  const allArgs = chunks.map((c) => toArgs(c))
  const [globalArgs, firstSectionArgs] = splitGlobals(allArgs[0]!)
  const strategyArgs: ArgEntry[][] = [firstSectionArgs, ...allArgs.slice(1)]
  const strategySections: StrategySection[] = strategyArgs.map((args) => ({
    label: labelForSection(args),
    args
  }))

  return {
    name: fallbackName,
    globalArgs,
    sections: strategySections,
    preamble: preambleLines.join('\n'),
    notRecommended
  }
}

function tokenize(line: string): string[] {
  const out: string[] = []
  let m: RegExpExecArray | null
  TOKEN_RE.lastIndex = 0
  while ((m = TOKEN_RE.exec(line))) out.push(m[1] !== undefined ? m[1] : m[2]!)
  return out
}

const GLOBAL_FLAG_NAMES = new Set(['wf-tcp', 'wf-udp', 'wf-raw', 'wf-save', 'debug'])

function splitGlobals(args: ArgEntry[]): [ArgEntry[], ArgEntry[]] {
  const globals: ArgEntry[] = []
  let i = 0
  while (i < args.length && GLOBAL_FLAG_NAMES.has(args[i]!.name)) {
    globals.push(args[i]!)
    i++
  }
  return [globals, args.slice(i)]
}

function toArgs(toks: string[]): ArgEntry[] {
  const out: ArgEntry[] = []
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]!
    if (!t.startsWith('--')) continue
    const eq = t.indexOf('=')
    if (eq >= 0) {
      out.push({ name: t.slice(2, eq), value: stripQuotes(t.slice(eq + 1)) })
    } else {
      const next = toks[i + 1]
      if (next && !next.startsWith('--')) {
        out.push({ name: t.slice(2), value: stripQuotes(next) })
        i++
      } else {
        out.push({ name: t.slice(2), value: '' })
      }
    }
  }
  return out
}

function stripQuotes(v: string): string {
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1)
  return v
}

/**
 * Replace `%BIN%` / `%LISTS%` with placeholders so we can re-inject real paths
 * at runtime from settings. Also normalize `"..."` wrappers stripped by tokenizer.
 */
function normalizeToken(tok: string): string {
  let t = tok
  if (t.startsWith('@') && !t.includes('%')) {
    t = '@%~dp0' + t.slice(1)
  }
  return t
    .replace(/%~dp0bin\\?/gi, BIN_PLACEHOLDER + '/')
    .replace(/%~dp0lists\\?/gi, LISTS_PLACEHOLDER + '/')
    .replace(/%~dp0/gi, LISTS_PLACEHOLDER + '/../')
    .replace(/%BIN%/gi, BIN_PLACEHOLDER + '/')
    .replace(/%LISTS%/gi, LISTS_PLACEHOLDER + '/')
    .replace(/\\/g, '/')
}

export function labelForSection(args: ArgEntry[]): string {
  const parts: string[] = []
  const tcp = args.find((a) => a.name === 'filter-tcp')
  const udp = args.find((a) => a.name === 'filter-udp')
  const l7 = args.find((a) => a.name === 'filter-l7')
  const hostDoms = args.find((a) => a.name === 'hostlist-domains')
  const desync = args.find((a) => a.name === 'dpi-desync')
  const host = args.find((a) => a.name === 'hostlist')
  if (tcp) parts.push(`TCP ${tcp.value}`)
  if (udp) parts.push(`UDP ${udp.value}`)
  if (l7) parts.push(`L7: ${l7.value}`)
  if (hostDoms) parts.push(hostDoms.value)
  else if (host) parts.push(basename(host.value))
  if (desync) parts.push(`→ ${desync.value}`)
  return parts.join(' · ') || 'Правило'
}

function basename(v: string): string {
  const i = Math.max(v.lastIndexOf('/'), v.lastIndexOf('\\'))
  return i >= 0 ? v.slice(i + 1) : v
}

/** Produce a ready-to-spawn argv for winws.exe given absolute install dirs. */
export function buildArgv(profile: Profile, binDir: string, listsDir: string): string[] {
  const argv: string[] = []
  const push = (entries: ArgEntry[]): void => {
    for (const a of entries) {
      const v = substitute(a.value, binDir, listsDir)
      if (v === '') argv.push(`--${a.name}`)
      else argv.push(`--${a.name}=${v}`)
    }
  }
  push(profile.globalArgs)
  const enabled = profile.sections.filter((s) => !s.disabled)
  for (let i = 0; i < enabled.length; i++) {
    argv.push('--new')
    push(enabled[i]!.args)
  }
  return argv
}

function substitute(value: string, binDir: string, listsDir: string): string {
  return value
    .replace(new RegExp(escapeRe(BIN_PLACEHOLDER) + '/?', 'g'), ensureTrailingSep(binDir))
    .replace(new RegExp(escapeRe(LISTS_PLACEHOLDER) + '/?', 'g'), ensureTrailingSep(listsDir))
}

function ensureTrailingSep(p: string): string {
  return p.endsWith('/') || p.endsWith('\\') ? p : p + (p.includes('\\') ? '\\' : '/')
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Render profile back into a Flowseal-compatible .bat. */
export function buildBat(profile: Profile): string {
  const enabled = profile.sections.filter((s) => !s.disabled)
  const lines: string[] = [
    '@echo off',
    'chcp 65001 > nul',
    ':: 65001 - UTF-8',
    '',
    'cd /d "%~dp0"',
    'set "BIN=%~dp0bin\\"',
    'set "LISTS=%~dp0lists\\"',
    'cd /d %BIN%',
    ''
  ]
  const fmt = (a: ArgEntry): string => {
    const v = a.value
      .replace(new RegExp(escapeRe(BIN_PLACEHOLDER) + '/', 'g'), '%BIN%')
      .replace(new RegExp(escapeRe(BIN_PLACEHOLDER), 'g'), '%BIN%')
      .replace(new RegExp(escapeRe(LISTS_PLACEHOLDER) + '/', 'g'), '%LISTS%')
      .replace(new RegExp(escapeRe(LISTS_PLACEHOLDER), 'g'), '%LISTS%')
      .replace(/\//g, '\\')
    if (v === '') return `--${a.name}`
    const needsQuotes = /[\s"]/.test(v) || v.includes('%')
    return needsQuotes ? `--${a.name}="${v}"` : `--${a.name}=${v}`
  }
  const globalPart = profile.globalArgs.map(fmt).join(' ')
  const head = `start "zapret: ${profile.name}" /min "%BIN%winws.exe" ${globalPart} ^`
  lines.push(head)
  for (let i = 0; i < enabled.length; i++) {
    const seg = enabled[i]!.args.map(fmt).join(' ')
    const last = i === enabled.length - 1
    lines.push(last ? seg : `${seg} --new ^`)
  }
  return lines.join('\r\n') + '\r\n'
}
