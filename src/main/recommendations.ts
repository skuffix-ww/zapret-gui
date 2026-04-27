import type { RecommendationCategory } from '@shared/types'

export const RECOMMENDATIONS: RecommendationCategory[] = [
  {
    id: 'browsers',
    label: 'Браузеры',
    icon: 'Globe',
    description: 'Privacy-friendly браузеры взамен Chrome/Edge.',
    items: [
      { id: 'brave', name: 'Brave', description: 'Chromium-форк со встроенным блокировщиком и Tor-вкладками.', url: 'https://brave.com', chocoId: 'brave' },
      { id: 'librewolf', name: 'LibreWolf', description: 'Firefox-форк с настройками приватности из коробки.', url: 'https://librewolf.net', chocoId: 'librewolf' },
      { id: 'firefox', name: 'Firefox', description: 'Mozilla. Лучшее открытое движение, плюс прокачивается arkenfox.', url: 'https://firefox.com', chocoId: 'firefox' },
      { id: 'mullvad-browser', name: 'Mullvad Browser', description: 'Tor-Project + Mullvad — Tor Browser без Tor-сети.', url: 'https://mullvad.net/en/browser', chocoId: 'mullvad-browser' },
      { id: 'tor-browser', name: 'Tor Browser', description: 'Через сеть Tor. Анонимный сёрфинг.', url: 'https://torproject.org', chocoId: 'tor-browser' },
      { id: 'ungoogled-chromium', name: 'Ungoogled Chromium', description: 'Chromium без Google-сервисов и трекинга.', url: 'https://github.com/ungoogled-software/ungoogled-chromium', chocoId: 'ungoogled-chromium' }
    ]
  },
  {
    id: 'vpn',
    label: 'VPN / Proxy',
    icon: 'Shield',
    description: 'Когда `winws` мало или нужна полная маршрутизация.',
    items: [
      { id: 'cf-warp', name: 'Cloudflare 1.1.1.1 + WARP', description: 'Бесплатный, лучший free-вариант. В РФ работает в связке с UnLimit (zapret).', url: 'https://1.1.1.1', chocoId: 'cloudflare-warp' },
      { id: 'protonvpn', name: 'Proton VPN', description: 'Швейцария, бесплатный тариф без лимита трафика.', url: 'https://protonvpn.com', chocoId: 'protonvpn' },
      { id: 'mullvad-vpn', name: 'Mullvad VPN', description: 'Анонимная регистрация по номеру аккаунта, фиксированные 5 €/мес.', url: 'https://mullvad.net', chocoId: 'mullvadvpn' },
      { id: 'amneziavpn', name: 'AmneziaVPN', description: 'Self-hosted на собственном VPS с обфускацией под Россию.', url: 'https://amnezia.org' },
      { id: 'tailscale', name: 'Tailscale', description: 'Mesh-VPN на WireGuard для своих устройств.', url: 'https://tailscale.com', chocoId: 'tailscale' },
      { id: 'wireguard', name: 'WireGuard', description: 'Низкоуровневый VPN-протокол. Базовый клиент.', url: 'https://wireguard.com', chocoId: 'wireguard' },
      { id: 'outline', name: 'Outline', description: 'Shadowsocks-клиент от Jigsaw (Google), self-hosted сервер.', url: 'https://getoutline.org' }
    ]
  },
  {
    id: 'privacy',
    label: 'Приватность и безопасность',
    icon: 'Lock',
    description: 'Менеджеры паролей, мессенджеры, шифрование.',
    items: [
      { id: 'bitwarden', name: 'Bitwarden', description: 'Open-source менеджер паролей с self-hosted опцией.', url: 'https://bitwarden.com', chocoId: 'bitwarden' },
      { id: 'keepassxc', name: 'KeePassXC', description: 'Локальный менеджер паролей в файле .kdbx.', url: 'https://keepassxc.org', chocoId: 'keepassxc' },
      { id: 'signal', name: 'Signal', description: 'E2E мессенджер, золотой стандарт приватности.', url: 'https://signal.org', chocoId: 'signal' },
      { id: 'session', name: 'Session', description: 'Мессенджер без номера и аккаунта поверх onion-сети.', url: 'https://getsession.org' },
      { id: 'cryptomator', name: 'Cryptomator', description: 'Прозрачное шифрование облачных папок (Drive/Dropbox/...).', url: 'https://cryptomator.org', chocoId: 'cryptomator' },
      { id: 'veracrypt', name: 'VeraCrypt', description: 'Шифрование томов и системного диска.', url: 'https://veracrypt.fr', chocoId: 'veracrypt' },
      { id: 'protonmail', name: 'Proton Mail', description: 'E2E почта в Швейцарии. Bridge для IMAP/SMTP.', url: 'https://proton.me' }
    ]
  },
  {
    id: 'utils',
    label: 'Системные утилиты',
    icon: 'Wrench',
    description: 'Чистка, поиск, скриншоты, кастомизация.',
    items: [
      { id: '7zip', name: '7-Zip', description: 'Архиватор. Просто 7-Zip.', url: 'https://7-zip.org', chocoId: '7zip' },
      { id: 'sharex', name: 'ShareX', description: 'Скриншоты, запись экрана, OCR, аплоад. Все в одном.', url: 'https://getsharex.com', chocoId: 'sharex' },
      { id: 'bcuninstaller', name: 'Bulk Crap Uninstaller', description: 'Массовое удаление программ + следов в реестре.', url: 'https://github.com/Klocman/Bulk-Crap-Uninstaller', chocoId: 'bulk-crap-uninstaller' },
      { id: 'powertoys', name: 'Microsoft PowerToys', description: 'FancyZones, PowerToys Run, Color Picker, и др.', url: 'https://github.com/microsoft/PowerToys', chocoId: 'powertoys' },
      { id: 'everything', name: 'Everything', description: 'Мгновенный поиск файлов по всему диску.', url: 'https://voidtools.com', chocoId: 'everything' },
      { id: 'explorer-patcher', name: 'ExplorerPatcher', description: 'Вернуть классический Explorer/контекстное меню в Win11.', url: 'https://github.com/valinet/ExplorerPatcher' },
      { id: 'privatezilla', name: 'Privatezilla', description: 'Pre-set приватных твиков Windows 10/11 (для тех, кому твики UnLimit мало).', url: 'https://github.com/builtbybel/privatezilla' },
      { id: 'rufus', name: 'Rufus', description: 'Создание загрузочных USB.', url: 'https://rufus.ie', chocoId: 'rufus' }
    ]
  },
  {
    id: 'gaming',
    label: 'Minecraft и игры',
    icon: 'Gamepad2',
    description: 'Лаунчеры, серверы, утилиты.',
    items: [
      { id: 'prismlauncher', name: 'Prism Launcher', description: 'Лучший open-source MC-лаунчер. Только лицензия.', url: 'https://prismlauncher.org', chocoId: 'prismlauncher' },
      { id: 'pineconemc', name: 'Pinecone Launcher', description: 'Форк Prism Launcher с поддержкой пиратских аккаунтов.', url: 'https://pineconemc.com' },
      { id: 'modrinth-app', name: 'Modrinth App', description: 'Лаунчер от Modrinth, удобная установка модов.', url: 'https://modrinth.com/app' },
      { id: 'atlauncher', name: 'ATLauncher', description: 'Альтернатива с большой коллекцией модпаков.', url: 'https://atlauncher.com', chocoId: 'atlauncher' },
      { id: 'lunarclient', name: 'Lunar Client', description: 'Закрытый, но популярный (FPS, оптимизация).', url: 'https://lunarclient.com' }
    ]
  },
  {
    id: 'media',
    label: 'Медиа и творчество',
    icon: 'Film',
    description: 'Плееры, рендер, запись.',
    items: [
      { id: 'vlc', name: 'VLC', description: 'Универсальный плеер.', url: 'https://videolan.org/vlc', chocoId: 'vlc' },
      { id: 'mpv', name: 'mpv', description: 'Минималистичный плеер с лучшим качеством картинки.', url: 'https://mpv.io', chocoId: 'mpv' },
      { id: 'obs-studio', name: 'OBS Studio', description: 'Запись и трансляция экрана.', url: 'https://obsproject.com', chocoId: 'obs-studio' },
      { id: 'audacity', name: 'Audacity', description: 'Редактор аудио.', url: 'https://audacityteam.org', chocoId: 'audacity' }
    ]
  },
  {
    id: 'dev',
    label: 'Разработка',
    icon: 'Code2',
    description: 'Если кодишь, базовый набор.',
    items: [
      { id: 'vscode', name: 'VS Code', description: 'Редактор кода Microsoft.', url: 'https://code.visualstudio.com', chocoId: 'vscode' },
      { id: 'git', name: 'Git', description: 'Система контроля версий.', url: 'https://git-scm.com', chocoId: 'git' },
      { id: 'nodejs', name: 'Node.js LTS', description: 'JavaScript-runtime.', url: 'https://nodejs.org', chocoId: 'nodejs-lts' },
      { id: 'python', name: 'Python 3', description: 'Питон.', url: 'https://python.org', chocoId: 'python' }
    ]
  },
  {
    id: 'gray',
    label: 'Серая зона',
    icon: 'AlertTriangle',
    description: 'Закрытый, пиратский или платный софт. На свой страх и риск.',
    items: [
      { id: 'repack-me', name: 'repack.me', description: 'Сайт с репаками лицензионных программ и VPN. Платная подписка, пиратский контент. Использование под вашу ответственность.', url: 'https://repack.me', warning: 'Платно · пиратский софт' },
      { id: 'rutracker', name: 'RuTracker', description: 'Старый-добрый трекер. Заблокирован в РФ — поможет UnLimit.', url: 'https://rutracker.org', warning: 'Заблокирован в РФ · 18+' }
    ]
  }
]
