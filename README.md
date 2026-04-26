# UnLimit

> Раньше — `Zapret GUI`. Сейчас разрастается в **privacy & freedom toolkit для Windows**: обход блокировок, TG-прокси, твики приватности, рекомендации софта, per-app firewall.

Ядро остаётся прежним — приятная обёртка поверх [zapret-discord-youtube от Flowseal](https://github.com/Flowseal/zapret-discord-youtube): вместо того, чтобы выбирать один из двух десятков `general (ALT7).bat` наугад, правите набор `--new` секций мышкой, переключаете стратегии в один клик и видите живые логи `winws.exe`.

Сделано **eblanchik.studios** ([eblanchik.ru](https://eblanchik.ru)).

> **⚠️ Важно.** Приложение отгружается «как есть», без тестов, без CI, без благословения Flowseal. Автор не несёт никакой ответственности за то, что оно не запустится или порвёт вам интернет. Баг → **issue** или **PR**, любое полезное PR будет замерджено после короткого ревью.

---

## Что умеет

- **Все 19 стратегий из официального репозитория Flowseal** как встроенные профили: `general`, `general (ALT)`..`(ALT11)`, `SIMPLE FAKE` × 3 варианта, `FAKE TLS AUTO` × 4 варианта. Обновляются автоматически при появлении нового релиза.
- **Визуальный редактор стратегий.** Каждая `--new` секция — отдельная карточка: можно менять `--filter-tcp`, `--dpi-desync`, порядок, включать/выключать, добавлять свои.
- **Автопроверка обновлений Flowseal.** При старте GUI стучится в GitHub Releases API. Если вышла новая версия — появляется окошко «Вышла новая версия X. Скачать? — Да / Напомнить позже / Нет».
- **Автозагрузка с GitHub.** При первом запуске скачивает последний релиз Flowseal в выбранную вами папку. Никаких ручных распаковок zip-ом.
- **Импорт/экспорт `.bat`.** Хотите поделиться стратегией с другом, которому GUI не нужен — экспорт в классический `.bat`, совместимый с оригинальным `service.bat`.
- **Управление Windows-службой.** Установка/удаление автозапуска через `sc.exe create binPath= "winws.exe ..."`. Аналог `service.bat install_winws`.
- **Редактор пользовательских списков.** `list-general-user.txt`, `list-exclude-user.txt`, `ipset-exclude-user.txt` — без открывания блокнотов и поисков папки в Explorer.
- **Живые логи `winws.exe`** прямо внизу главного экрана — stdout/stderr с подсветкой уровней.
- **GameFilter настройки.** `%GameFilterTCP%` / `%GameFilterUDP%` не зашиты намертво, а задаются в GUI.

## Скриншоты

потом

## Установка

Проще всего — взять готовый `.exe` из [Releases](https://github.com/skuffix-ww/zapret-gui/releases). Установщик NSIS, запускать **от имени администратора** (иначе `WinDivert` не сможет зацепиться за сетевой стек).

При первом запуске открывается мастер:

1. **Скачать с GitHub** — приложение само скачает последний релиз Flowseal и распакует в папку, которую вы выбрали.
2. **Указать установленный** — если zapret уже лежит где-то на диске, просто ткнёте в папку с `bin/winws.exe` и `lists/`.

## Системные требования

- Windows 10 / 11 (zapret-windows же, на Linux/macOS просто не взлетит).
- Права администратора — нужны `WinDivert`'у, чтобы хукать сетевые пакеты.
- Интернет — чтобы скачать релиз Flowseal и проверять обновления (потом можно оффлайн).

## Сборка из исходников

```bash
git clone https://github.com/skuffix-ww/zapret-gui.git
cd zapret-gui
npm install
npm run dev            # dev-режим с hot-reload
npm run build:win      # NSIS-инсталлятор в release/
```

Для обновления встроенных профилей после обновления `_research/bats/`:

```bash
npm run gen:profiles
```

## Как это работает

### Модель данных

Стратегия Flowseal — это длинная команда `winws.exe` с блоками, разделёнными `--new`:

```
winws.exe --wf-tcp=80,443 --wf-udp=443 \
  --filter-udp=443 --hostlist=... --dpi-desync=fake --new \
  --filter-tcp=443 --hostlist=... --dpi-desync=multisplit --new \
  ...
```

Парсер в `src/shared/bat-parser.ts` разбирает это в:

```ts
interface Profile {
  globalArgs: ArgEntry[]      // --wf-tcp, --wf-udp (до первого --new)
  sections: StrategySection[] // каждая секция = один блок между --new
}
```

`%BIN%` / `%LISTS%` заменяются на плейсхолдеры `${BIN}` / `${LISTS}`, которые при запуске подставляются реальными путями из настроек.

### Запуск

`src/main/runner.ts` собирает `argv`, спавнит `winws.exe` через `child_process.spawn` без `shell`, чтобы не было проблем с экранированием, и стримит stdout/stderr в логгер. Нет никакого `cmd /c start`.

### Служба

`src/main/service.ts` использует системный `sc.exe create <имя> binPath= "\"winws.exe\" <флаги>" start= auto`. Корректно экранирует кавычки внутри `binPath`.

### Обновления

`src/main/updater.ts` бьёт в `https://api.github.com/repos/Flowseal/zapret-discord-youtube/releases/latest`, сравнивает `tag_name` с `installedReleaseTag` из настроек. Проверка проходит через 2 секунды после запуска + каждые 6 часов при открытом GUI. «Напомнить позже» сохраняет `updateRemindAt = now + 24h`, «Нет» сохраняет пропущенный тег, чтобы не доставать. В настройках есть кнопка «Проверить обновления» для ручной проверки.

## Структура

```
src/
├── main/                    # Electron main: всё бэк-ендное
│   ├── index.ts             # создание окна, лайфцикл
│   ├── ipc.ts               # IPC handlers, точка входа для renderer
│   ├── downloader.ts        # GitHub release → папка установки
│   ├── updater.ts           # проверка обновлений
│   ├── runner.ts            # child_process для winws.exe
│   ├── service.ts           # sc.exe create/delete/start/stop
│   ├── profiles.ts          # CRUD профилей + встроенные
│   ├── lists.ts             # чтение/запись list-*-user.txt
│   ├── settings.ts          # electron-store
│   ├── logger.ts            # EventEmitter → UI
│   └── paths.ts             # utility
├── preload/
│   └── index.ts             # contextBridge → window.api
├── shared/                  # общее между main и renderer
│   ├── types.ts             # Profile, AppSettings, IPC channels
│   └── bat-parser.ts        # parseBat, buildArgv, buildBat
└── renderer/                # React UI
    ├── src/
    │   ├── App.tsx
    │   ├── store.ts         # Zustand state
    │   ├── components/
    │   │   ├── Titlebar.tsx
    │   │   ├── Sidebar.tsx
    │   │   ├── LogPanel.tsx
    │   │   ├── ArgEditor.tsx
    │   │   ├── UpdatePrompt.tsx
    │   │   └── UpdateProgressToast.tsx
    │   └── pages/
    │       ├── HomePage.tsx
    │       ├── EditorPage.tsx
    │       ├── ListsPage.tsx
    │       ├── SettingsPage.tsx
    │       └── SetupPage.tsx
    └── index.html

scripts/
├── build-default-profiles.mjs   # .bat → resources/default-profiles.json
└── sanity-check.mjs             # быстрая валидация парсера

_research/bats/              # исходные .bat Flowseal'а (источник истины)
resources/
└── default-profiles.json    # сгенерированный набор встроенных профилей
```

## Стек

- Electron 33
- [electron-vite](https://electron-vite.org/) — сборка main/preload/renderer
- React 18 + TypeScript
- TailwindCSS
- Zustand (глобальный state)
- lucide-react (иконки)
- adm-zip (распаковка релиза)
- electron-store (persist настроек)
- electron-builder (NSIS инсталлятор)

## Roadmap UnLimit

- [x] Ребрендинг → UnLimit, новый логотип, интро-видео
- [ ] **TG-прокси** ([Flowseal/tg-ws-proxy](https://github.com/Flowseal/tg-ws-proxy)) встроенным Start/Stop
- [ ] **Рекомендации софта** с автопарсингом иконок: Minecraft-лаунчеры (PrismLauncher / PineconeMC), VPN (Cloudflare 1.1.1.1, repack.me), браузеры, утилиты приватности
- [ ] **Privacy tweaks** (à la Chris Titus WinUtil): отключение телеметрии, рекламы, Cortana, Bing-поиска, и т. д. — apply/revert с rollback
- [ ] **UnGoogleYs** — отписать систему от Google
- [ ] **Per-app firewall** — запретить интернет выбранным приложениям (через `netsh advfirewall`)
- [ ] **Quick-launcher**: кнопки/хоткеи для запуска любых программ
- [ ] Системный трей + автозапуск
- [ ] Локализация (пока только русский)

## Благодарности

- **[Flowseal](https://github.com/Flowseal)** — за оригинальный [zapret-discord-youtube](https://github.com/Flowseal/zapret-discord-youtube) и весь подбор стратегий. Без него этой программы бы не было — она просто кнопочки к его работе. Также за [tg-ws-proxy](https://github.com/Flowseal/tg-ws-proxy).
- **[bol-van/zapret](https://github.com/bol-van/zapret)** — за сам движок (`winws.exe`, WinDivert-интеграция).
- **[Chris Titus Tech](https://github.com/ChrisTitusTech/winutil)** — за вдохновение для раздела твиков.

## Лицензия

MIT. Делайте что хотите.

Бинарники `winws.exe`, `WinDivert*.dll` и списки `lists/*.txt` скачиваются с релизов Flowseal'а и не включены в этот репозиторий. У каждого своя лицензия, смотрите [оригинальный репо](https://github.com/Flowseal/zapret-discord-youtube).

---

Если читаете эту строку — спасибо. Ставьте звёздочку, ешьте вкусно, платите по счетам.
