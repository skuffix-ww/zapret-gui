// Generates resources/default-profiles.json by parsing every .bat in _research/bats/.
// We inline a JS port of the parser to avoid a TS compile step in this build script.

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname, basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const BATS_DIR = join(ROOT, '_research', 'bats')
const OUT_DIR = join(ROOT, 'resources')
const OUT_FILE = join(OUT_DIR, 'default-profiles.json')

const BIN_PLACEHOLDER = '${BIN}'
const LISTS_PLACEHOLDER = '${LISTS}'
const CONTINUATION_MARKER = '___ZAPRET_LINE_CONTINUATION___'
const TOKEN_RE = /"([^"]*)"|(\S+)/g

function parseBat(raw, name) {
  const text = raw.replace(/\r\n?/g, '\n')
  const contentLines = []
  let seenWinws = false
  let notRecommended = false
  for (const line of text.split('\n')) {
    if (/::\s*NOT RECOMMENDED/i.test(line)) notRecommended = true
    if (!seenWinws) {
      if (/winws\.exe/i.test(line)) {
        seenWinws = true
        contentLines.push(line)
      }
    } else {
      contentLines.push(line)
    }
  }
  const joined = contentLines
    .map((l) => l.replace(/\s*\^\s*$/, ` ${CONTINUATION_MARKER} `))
    .join(' ')
    .replace(new RegExp(CONTINUATION_MARKER, 'g'), '')

  const winwsIdx = joined.toLowerCase().indexOf('winws.exe')
  const afterWinws = winwsIdx >= 0 ? joined.slice(winwsIdx + 'winws.exe'.length) : joined
  const trimmed = afterWinws.replace(/^"/, '').trim()

  const tokens = []
  TOKEN_RE.lastIndex = 0
  let m
  while ((m = TOKEN_RE.exec(trimmed))) tokens.push(m[1] !== undefined ? m[1] : m[2])
  const normalized = tokens.map((t) =>
    t
      .replace(/%~dp0bin\\?/gi, BIN_PLACEHOLDER + '/')
      .replace(/%BIN%/gi, BIN_PLACEHOLDER + '/')
      .replace(/%LISTS%/gi, LISTS_PLACEHOLDER + '/')
      .replace(/\\/g, '/')
  )

  const chunks = [[]]
  for (const tok of normalized) {
    if (tok === '--new') chunks.push([])
    else chunks[chunks.length - 1].push(tok)
  }

  const stripQuotes = (v) => (v.length >= 2 && v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1) : v)
  const toArgs = (toks) => {
    const out = []
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i]
      if (!t.startsWith('--')) continue
      const eq = t.indexOf('=')
      if (eq >= 0) out.push({ name: t.slice(2, eq), value: stripQuotes(t.slice(eq + 1)) })
      else {
        const next = toks[i + 1]
        if (next && !next.startsWith('--')) {
          out.push({ name: t.slice(2), value: stripQuotes(next) })
          i++
        } else out.push({ name: t.slice(2), value: '' })
      }
    }
    return out
  }

  const GLOBALS = new Set(['wf-tcp', 'wf-udp', 'wf-raw', 'wf-save', 'debug'])
  const allArgs = chunks.map(toArgs)
  const first = allArgs[0]
  const globalArgs = []
  let i = 0
  while (i < first.length && GLOBALS.has(first[i].name)) {
    globalArgs.push(first[i])
    i++
  }
  const firstSection = first.slice(i)
  const strategySections = [firstSection, ...allArgs.slice(1)].map((args) => ({
    label: labelFor(args),
    args
  }))
  return { name, globalArgs, sections: strategySections, notRecommended }
}

function labelFor(args) {
  const find = (n) => args.find((a) => a.name === n)
  const parts = []
  const tcp = find('filter-tcp')
  const udp = find('filter-udp')
  const l7 = find('filter-l7')
  const hostDoms = find('hostlist-domains')
  const host = find('hostlist')
  const desync = find('dpi-desync')
  if (tcp) parts.push(`TCP ${tcp.value}`)
  if (udp) parts.push(`UDP ${udp.value}`)
  if (l7) parts.push(`L7: ${l7.value}`)
  if (hostDoms) parts.push(hostDoms.value)
  else if (host) {
    const v = host.value
    const i = Math.max(v.lastIndexOf('/'), v.lastIndexOf('\\'))
    parts.push(i >= 0 ? v.slice(i + 1) : v)
  }
  if (desync) parts.push(`→ ${desync.value}`)
  return parts.join(' · ') || 'Правило'
}

function idFor(name) {
  return 'builtin:' + createHash('sha1').update(name).digest('hex').slice(0, 10)
}

function stripExt(n) {
  return n.replace(/\.bat$/i, '')
}

function main() {
  if (!existsSync(BATS_DIR)) {
    console.error(`[build-default-profiles] missing ${BATS_DIR}`)
    process.exit(1)
  }
  const files = readdirSync(BATS_DIR).filter((f) => f.toLowerCase().endsWith('.bat')).sort()
  const profiles = []
  for (const f of files) {
    const raw = readFileSync(join(BATS_DIR, f), 'utf8')
    const displayName = stripExt(basename(f))
    const parsed = parseBat(raw, displayName)
    profiles.push({
      id: idFor(displayName),
      name: displayName,
      builtin: true,
      description: parsed.notRecommended ? 'НЕ РЕКОМЕНДУЕТСЯ (флаг из официального .bat)' : '',
      globalArgs: parsed.globalArgs,
      sections: parsed.sections,
      updatedAt: 0
    })
  }
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(OUT_FILE, JSON.stringify({ profiles, generatedAt: new Date().toISOString() }, null, 2), 'utf8')
  console.log(`[build-default-profiles] wrote ${profiles.length} profiles → ${OUT_FILE}`)
}

main()
