import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { listsDir } from './paths'
import { getSettings } from './settings'
import { logger } from './logger'

export interface GameFix {
  id: string
  label: string
  description: string
  /** Lucide icon name. */
  icon: string
  /** Brand colour for the chip (hex). */
  color: string
  /** Domains that need to be added to list-general-user.txt for the workaround. */
  domains: string[]
  /** CIDR-сети для добавления в lists/ipset-all.txt — нужны когда домен-фильтр не работает (Roblox). */
  ipsets?: string[]
}

const ROBLOX_IPSETS = [
  '103.140.28.0/23',
  '128.116.0.0/17',
  '128.116.0.0/24',
  '128.116.1.0/24',
  '128.116.5.0/24',
  '128.116.11.0/24',
  '128.116.13.0/24',
  '128.116.21.0/24',
  '128.116.22.0/24',
  '128.116.31.0/24',
  '128.116.32.0/24',
  '128.116.33.0/24',
  '128.116.35.0/24',
  '128.116.44.0/24',
  '128.116.45.0/24',
  '128.116.46.0/24',
  '128.116.48.0/24',
  '128.116.50.0/24',
  '128.116.51.0/24',
  '128.116.53.0/24',
  '128.116.54.0/24',
  '128.116.55.0/24',
  '128.116.56.0/24',
  '128.116.57.0/24',
  '128.116.63.0/24',
  '128.116.64.0/24',
  '128.116.67.0/24',
  '128.116.74.0/24',
  '128.116.80.0/24',
  '128.116.81.0/24',
  '128.116.84.0/24',
  '128.116.86.0/24',
  '128.116.87.0/24',
  '128.116.88.0/24',
  '128.116.95.0/24',
  '128.116.97.0/24',
  '128.116.99.0/24',
  '128.116.102.0/24',
  '128.116.104.0/24',
  '128.116.105.0/24',
  '128.116.115.0/24',
  '128.116.116.0/24',
  '128.116.117.0/24',
  '128.116.119.0/24',
  '128.116.120.0/24',
  '128.116.123.0/24',
  '128.116.127.0/24',
  '141.193.3.0/24',
  '205.201.62.0/24'
]

/**
 * Workarounds discovered through trial-and-error: добавляем эти домены в list-general-user.txt
 * — winws начинает применять стратегию к их трафику.
 */
export const FIXES: GameFix[] = [
  {
    id: 'sbox',
    label: 's&box',
    description: 'Facepunch-овский песочничный конструктор. Без этих доменов лагает и не пускает на серверы.',
    icon: 'Gamepad2',
    color: '#3F8EFC',
    domains: ['sbox.game', 'asset.party', 'facepunch.com']
  },
  {
    id: 'roblox',
    label: 'Roblox',
    description: 'Игровая платформа. Помимо доменов добавляются IP-сети Roblox в ipset-all.txt — без них домен-фильтр часто не цепляет соединение.',
    icon: 'Gamepad2',
    color: '#E2241B',
    domains: ['roblox.com', 'rbxcdn.com', 'roblox-api.com', 'rbxstatic.com', 'rbxcdn.akamaized.net'],
    ipsets: ROBLOX_IPSETS
  },
  {
    id: 'rust',
    label: 'Rust',
    description: 'Facepunch survival. Если долгий поиск/коннект к серверам через Cloudflare.',
    icon: 'Gamepad2',
    color: '#CD412B',
    domains: ['facepunch.com', 'rust.facepunch.com', 'companion-rust.facepunch.com']
  },
  {
    id: 'apex',
    label: 'Apex Legends',
    description: 'EA/Respawn. Долгий matchmaking при шейпинге провайдером.',
    icon: 'Gamepad2',
    color: '#DA292A',
    domains: ['ea.com', 'easo.ea.com', 'origin.com', 'respawn.com']
  },
  {
    id: 'cs2',
    label: 'Counter-Strike 2',
    description: 'Лаги/долгий matchmaking — domain workaround поверх Steam-инфраструктуры.',
    icon: 'Gamepad2',
    color: '#F9A825',
    domains: ['steamcommunity.com', 'steampowered.com', 'akamaihd.net', 'steamserver.net', 'csgo.com']
  },
  {
    id: 'discord',
    label: 'Discord',
    description: 'Если voice/video не подключаются или CDN не отвечает.',
    icon: 'MessageCircle',
    color: '#5865F2',
    domains: [
      'discord.com',
      'discord.gg',
      'discordapp.com',
      'discordapp.net',
      'cdn.discordapp.com',
      'media.discordapp.net',
      'gateway.discord.gg'
    ]
  },
  {
    id: 'youtube',
    label: 'YouTube',
    description: 'Видео тормозит / 0 байт буфера. Добавляет YT-CDN.',
    icon: 'Youtube',
    color: '#FF0000',
    domains: ['youtube.com', 'youtu.be', 'googlevideo.com', 'ytimg.com', 'youtubei.googleapis.com']
  },
  {
    id: 'twitch',
    label: 'Twitch',
    description: 'Стримы лагают / не запускаются.',
    icon: 'Tv',
    color: '#9146FF',
    domains: ['twitch.tv', 'ttvnw.net', 'jtvnw.net', 'twitchcdn.net']
  },
  {
    id: 'spotify',
    label: 'Spotify',
    description: 'Музыка не грузится / частые обрывы.',
    icon: 'Music',
    color: '#1DB954',
    domains: ['spotify.com', 'scdn.co', 'spotifycdn.com', 'audio-fa.scdn.co']
  },
  {
    id: 'chatgpt',
    label: 'ChatGPT / OpenAI',
    description: 'Если не открывается chatgpt.com или прерывается стрим ответа.',
    icon: 'Sparkles',
    color: '#10A37F',
    domains: ['openai.com', 'chatgpt.com', 'chat.openai.com', 'oaistatic.com', 'oaiusercontent.com']
  }
]

const USER_LIST = 'list-general-user.txt'
const IPSET_FILE = 'ipset-all.txt'
const DOMAIN_PLACEHOLDER = 'domain.example.abc'
const IPSET_PLACEHOLDER = '0.0.0.0/0'

function listFilePath(name: string): string {
  const settings = getSettings()
  if (!settings.installPath) throw new Error('Не выбран путь установки. Укажите его в Настройках.')
  return join(listsDir(settings.installPath), name)
}

function readListEntries(name: string, placeholder: string): string[] {
  const p = listFilePath(name)
  if (!existsSync(p)) return []
  return readFileSync(p, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l !== placeholder)
}

function writeListEntries(name: string, entries: string[], placeholder: string): void {
  const p = listFilePath(name)
  const out = entries.length > 0 ? entries.join('\r\n') + '\r\n' : placeholder + '\r\n'
  writeFileSync(p, out, 'utf8')
}

export interface FixState {
  id: string
  applied: boolean
  /** Сколько доменов из фикса уже в списке. */
  present: number
  total: number
  /** Сколько IP-сетей применено / всего (если фикс содержит ipsets). */
  ipsetsPresent?: number
  ipsetsTotal?: number
}

export function listFixesWithState(): Array<GameFix & FixState> {
  let domains: Set<string>
  let ipsets: Set<string>
  try {
    domains = new Set(readListEntries(USER_LIST, DOMAIN_PLACEHOLDER).map((d) => d.toLowerCase()))
  } catch {
    domains = new Set()
  }
  try {
    ipsets = new Set(readListEntries(IPSET_FILE, IPSET_PLACEHOLDER))
  } catch {
    ipsets = new Set()
  }
  return FIXES.map((f) => {
    const domainsPresent = f.domains.filter((d) => domains.has(d.toLowerCase())).length
    const ipsetsTotal = f.ipsets?.length ?? 0
    const ipsetsPresent = f.ipsets?.filter((ip) => ipsets.has(ip)).length ?? 0
    const allDomainsApplied = domainsPresent === f.domains.length
    const allIpsetsApplied = ipsetsTotal === 0 || ipsetsPresent === ipsetsTotal
    return {
      ...f,
      applied: allDomainsApplied && allIpsetsApplied,
      present: domainsPresent,
      total: f.domains.length,
      ipsetsPresent,
      ipsetsTotal
    }
  })
}

export function applyFix(id: string): FixState {
  const fix = FIXES.find((f) => f.id === id)
  if (!fix) throw new Error(`Фикс «${id}» не найден`)
  const currentDomains = readListEntries(USER_LIST, DOMAIN_PLACEHOLDER)
  const lower = new Set(currentDomains.map((d) => d.toLowerCase()))
  const nextDomains = [...currentDomains]
  let addedDomains = 0
  for (const d of fix.domains) {
    if (!lower.has(d.toLowerCase())) {
      nextDomains.push(d)
      lower.add(d.toLowerCase())
      addedDomains++
    }
  }
  writeListEntries(USER_LIST, nextDomains, DOMAIN_PLACEHOLDER)

  let addedIpsets = 0
  if (fix.ipsets && fix.ipsets.length > 0) {
    const currentIps = readListEntries(IPSET_FILE, IPSET_PLACEHOLDER)
    const present = new Set(currentIps)
    const nextIps = [...currentIps]
    for (const ip of fix.ipsets) {
      if (!present.has(ip)) {
        nextIps.push(ip)
        present.add(ip)
        addedIpsets++
      }
    }
    writeListEntries(IPSET_FILE, nextIps, IPSET_PLACEHOLDER)
  }
  logger.info(
    `Фикс «${fix.label}»: добавлено ${addedDomains} доменов` +
      (fix.ipsets ? `, ${addedIpsets} IP-сетей` : '')
  )
  return {
    id,
    applied: true,
    present: fix.domains.length,
    total: fix.domains.length,
    ipsetsPresent: fix.ipsets?.length ?? 0,
    ipsetsTotal: fix.ipsets?.length ?? 0
  }
}

export function revertFix(id: string): FixState {
  const fix = FIXES.find((f) => f.id === id)
  if (!fix) throw new Error(`Фикс «${id}» не найден`)
  const currentDomains = readListEntries(USER_LIST, DOMAIN_PLACEHOLDER)
  const removeDomains = new Set(fix.domains.map((d) => d.toLowerCase()))
  const nextDomains = currentDomains.filter((d) => !removeDomains.has(d.toLowerCase()))
  const removedDomains = currentDomains.length - nextDomains.length
  writeListEntries(USER_LIST, nextDomains, DOMAIN_PLACEHOLDER)

  let removedIpsets = 0
  if (fix.ipsets && fix.ipsets.length > 0) {
    const currentIps = readListEntries(IPSET_FILE, IPSET_PLACEHOLDER)
    const removeIps = new Set(fix.ipsets)
    const nextIps = currentIps.filter((ip) => !removeIps.has(ip))
    removedIpsets = currentIps.length - nextIps.length
    writeListEntries(IPSET_FILE, nextIps, IPSET_PLACEHOLDER)
  }
  logger.info(
    `Фикс «${fix.label}»: удалено ${removedDomains} доменов` +
      (fix.ipsets ? `, ${removedIpsets} IP-сетей` : '')
  )
  return {
    id,
    applied: false,
    present: 0,
    total: fix.domains.length,
    ipsetsPresent: 0,
    ipsetsTotal: fix.ipsets?.length ?? 0
  }
}
