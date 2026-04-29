# UnLimit

Privacy & freedom toolkit для Windows. Электрон-обёртка над [zapret-discord-youtube](https://github.com/Flowseal/zapret-discord-youtube) от Flowseal плюс набор смежных утилит — диагностика, рекомендации софта, твики приватности и фиксы для игр.

Работает поверх движка [bol-van/zapret](https://github.com/bol-van/zapret) (`winws.exe` + `WinDivert`). UnLimit не изобретает новые DPI-стратегии — он даёт удобный способ их выбирать, тестировать и применять.

---

## Возможности

### Обход блокировок
- Все встроенные стратегии Flowseal как профили: `general`, `general (ALT1..11)`, `SIMPLE FAKE`, `FAKE TLS AUTO` и т.д. Обновляются вместе с релизами Flowseal.
- Визуальный редактор `--new` секций: меняйте `--filter-tcp`, `--dpi-desync`, порядок, добавляйте свои.
- Импорт и экспорт `.bat` — совместимо с оригинальным `service.bat`.
- Установка/удаление Windows-службы через `sc.exe` (аналог `service.bat install_winws`).
- Редактор пользовательских списков (`list-general-user.txt`, `list-exclude-user.txt`, `ipset-exclude-user.txt`).
- Авто-проверка релизов Flowseal с диалогом «Скачать / Напомнить позже / Пропустить».

### Тест альтов
Прогоняет каждый профиль по очереди: запускает winws, прогревает 2.5с, пингует Discord/YouTube/Twitch и показывает топ-10 по avg-пингу. Удобно когда у вас «работает только ALT5» — найдёт реально лучший вариант для вашего провайдера.

### Диагностика
TLS-handshake до 18 популярных хостов (Discord/YouTube/Twitch/Steam/Telegram/Reddit/Spotify/ChatGPT/Roblox и т.д.). Запустите до и после включения UnLimit — увидите разницу.

### Фиксы для игр и сервисов
Кнопкой добавляет нужные домены в `list-general-user.txt`, чтобы winws применял стратегию к их трафику. Поддержано: s&box, Roblox (+ 47 IP-сетей в `ipset-all.txt`), Rust, Apex, CS2, Discord, YouTube, Twitch, Spotify, ChatGPT.

### Рекомендации софта
Подборка privacy / freedom утилит с one-click установкой через Chocolatey: лаунчеры, браузеры, репаки, VPN, утилиты приватности.

### Твики приватности
Apply/revert изменений реестра в духе Chris Titus WinUtil: отключение телеметрии, рекламы, Bing-поиска и т.п. С возможностью откатить.

### Прочее
- Живые логи `winws.exe` со stdout/stderr и подсветкой уровней.
- Уведомления при запуске трекаемых игр.
- Кастомные `GameFilterTCP` / `GameFilterUDP`.

---

## Установка

Скачайте `UnLimit-X.Y.Z-Setup.exe` или `UnLimit-X.Y.Z-Portable.exe` со страницы [Releases](https://github.com/skuffix-ww/UnLimit/releases). Запускать **от имени администратора** — без этого `WinDivert` не сможет хукнуть сетевой стек.

При первом запуске мастер предложит:
1. **Скачать с GitHub** — UnLimit сам скачает последний релиз Flowseal в выбранную папку.
2. **Указать установленный** — если zapret уже лежит на диске, ткните в папку с `bin/winws.exe` и `lists/`.

Бинарники подписаны self-signed сертификатом `skuffix.dev`, при первом запуске SmartScreen может ругаться.

## Системные требования

- Windows 10 / 11
- Права администратора (для `WinDivert`)
- Интернет для первой установки и проверки обновлений

---

## Сборка из исходников

```bash
git clone https://github.com/skuffix-ww/UnLimit.git
cd UnLimit
npm install
npm run dev            # dev-режим
npm run build:win      # NSIS + portable в release/
```

Регенерация встроенных профилей после правок `_research/bats/`:

```bash
npm run gen:profiles
```

---

## Как это устроено

Стратегия Flowseal — это команда `winws.exe` с блоками `--new`:

```
winws.exe --wf-tcp=80,443 --wf-udp=443
  --filter-udp=443 --hostlist=... --dpi-desync=fake --new
  --filter-tcp=443 --hostlist=... --dpi-desync=multisplit --new
  ...
```

Парсер в `src/shared/bat-parser.ts` разбирает её в:

```ts
interface Profile {
  globalArgs: ArgEntry[]      // флаги до первого --new
  sections: StrategySection[] // блоки между --new
}
```

Плейсхолдеры `%BIN%` / `%LISTS%` заменяются на реальные пути из настроек при запуске. `runner.ts` спавнит `winws.exe` через `child_process.spawn` без shell, стримит stdout/stderr в логгер.

Модули:

- `src/main/` — main-процесс: runner, downloader, updater, service, recommendations, tweaks, fixes, diagnostics, profile bench
- `src/preload/index.ts` — `contextBridge` → `window.api`
- `src/shared/` — общие типы и `bat-parser`
- `src/renderer/` — React UI на Zustand

---

## Стек

Electron 33 · electron-vite · React 18 · TypeScript · TailwindCSS · Zustand · lucide-react · electron-builder

---

## Roadmap

- [x] Все стратегии Flowseal как встроенные профили
- [x] Авто-обновления Flowseal-релизов
- [x] Управление Windows-службой
- [x] Рекомендации софта + Chocolatey
- [x] Privacy-твики (apply/revert)
- [x] Фиксы для игр (Roblox + IP-сети, s&box, Discord и др.)
- [x] Диагностика хостов с фавиконками
- [x] Тест альтов (поиск лучшего профиля под провайдера)
- [ ] **TG-прокси** ([Flowseal/tg-ws-proxy](https://github.com/Flowseal/tg-ws-proxy)) — встроенный Start/Stop
- [ ] **Per-app firewall** — запрет интернета выбранным приложениям (`netsh advfirewall`)
- [ ] **UnGoogleYs** — отвязка системы от Google
- [ ] Системный трей + автозапуск
- [ ] Локализация (сейчас только русский)

---

## Благодарности

- **[Flowseal](https://github.com/Flowseal)** — за [zapret-discord-youtube](https://github.com/Flowseal/zapret-discord-youtube), подбор стратегий и [tg-ws-proxy](https://github.com/Flowseal/tg-ws-proxy).
- **[bol-van/zapret](https://github.com/bol-van/zapret)** — за движок `winws.exe` и WinDivert-интеграцию.
- **[Chris Titus Tech](https://github.com/ChrisTitusTech/winutil)** — за идеи для раздела твиков.

## Лицензия

MIT.

Бинарники `winws.exe`, `WinDivert*.dll` и списки `lists/*.txt` не входят в этот репозиторий — они скачиваются с релизов Flowseal'а под своими лицензиями.
