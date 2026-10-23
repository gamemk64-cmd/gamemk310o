# v12 — люди, настройки, голос, приложение

## Что установить (3 шага)
1. Положи в папку сайта (рядом с index.html) файлы: `index.html`, `voice.js`, `v12.js`, `v12.css`, `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png`. Остальные файлы (karaoke.*, lyrics-config.js) не менялись.
2. Supabase → SQL Editor → вставь `supabase-v12.sql` → Run (один раз). Без этого раздел «Люди» покажет подсказку.
3. Открой сайт, нажми Ctrl+F5 (обновить кэш).

## Новое
- **Люди** (меню): поиск пользователей по нику, список «Недавно появились», открыть человека → его песни. ♡ на песне = она сразу попадает в плейлист «Понравилось у людей» и в избранное, даже если не скачана (играет из YouTube/Audius/iTunes). Если у автора это был обычный файл, песню ищут в сети по названию и исполнителю.
- **Общий доступ**: Настройки → Люди → придумать ник и включить «Показывать мою музыку». Видны избранное и песни из плейлистов (только названия и ссылки, файлы не передаются). Обновляется само.
- **Настройки**: одна кнопка, внутри вкладки: Стиль, Интерфейс, Голос, Люди, Приложение. Старые «Стиль» и «Интерфейс» в меню убраны (это была одна и та же страница).
- **Добавить как приложение**: Настройки → Приложение. Кнопка ставит сайт как приложение (ПК и телефон); если браузер не даёт поставить сам — показывает шаги для iPhone/Android/ПК. Нужен https.
- **Голос**: сказал «Вась, Моргенштерн» — большой вопрос «Где искать: моя музыка или мировой поиск?» с двумя кнопками; можно ответить голосом («в моей музыке» / «в мировом поиске» / «отмена»). Режим переключается в Настройки → Голос → «Где искать песню».
- **Большой текст**: то, что слышит помощник, и его ответ показываются крупно по центру, слова появляются по одному.
- **Анимации смены песни**: обложка, название (направление зависит от «вперёд/назад»), свечение и кольцо. Выключаются в Настройки → Интерфейс.

## Исправлено
- «Продолжить / пауза» голосом теперь по-настоящему нажимают кнопку плеера (она видимо «нажимается»), затем проверяют результат и добивают напрямую, если плеер не отреагировал.
- Помощник мог «оглохнуть» после своего голосового ответа, если браузер не присылал сигнал окончания речи — добавлен сторожевой таймер.
- Телефон: распознавание теперь работает фраза за фразой (в «непрерывном» режиме на телефонах были обрывы и дубли), быстрее перезапускается, понятные сообщения об ошибках микрофона/сети. Рядом с кнопкой «Голос» появилась кнопка 🎙 «нажми и скажи» — самый надёжный способ на iPhone.


## Android performance and voice hotfix
- On Android, voice recognition now listens for one phrase per tap instead of continually reopening the microphone. This avoids repeated audio-focus grabs that can pause music; tap **Голос** again for the next command.
- Reduced costly glass blur and hover effects on touch devices while preserving the dark/gold style.
- Bumped the service-worker cache version so the updated files are picked up after deployment.


## Spotify-inspired redesign
- Полностью обновлена оболочка: тёмная тема, компактная навигация слева, карточки библиотеки и единый нижний плеер.
- Убраны визуальные конфликты между несколькими слоями оформления; существующая логика воспроизведения, библиотека, голос, облачные функции и PWA-файлы сохранены.
- Меню кастомизации открывается правым кликом по пустой области: тема, акцентный цвет, масштаб, динамический фон, стекло и перемещение панелей. Настройки сохраняются в браузере.
- Адаптивная раскладка для телефона и небольших экранов.


## Spotify-inspired desktop redesign
- Reworked the desktop shell, sidebar, cards, top search bar, and bottom player to a Spotify-inspired layout.
- Preserved local music, playlist, queue, equalizer, voice, account, and customization code.
- Added a visible customization entry point and responsive layout.

## Интерфейс cleanup (22.10.2026)
- Удалён бит-режим и все его кнопки/горячие клавиши.
- «Стиль» и «Интерфейс» доступны только как вкладки в едином разделе «Настройки»; отдельные пункты меню не дублируются.
- В настройки перенесены тема, акцентный цвет, макет, масштаб, фон/стекло, популярные песни и параметры чарта.
- Кнопка шестерёнки в верхней панели открывает единый раздел «Настройки».
- Убраны лишние экспериментальные пункты навигации и автоматическое всплывающее окно обновления при первом запуске.
- Проверены синтаксис встроенных скриптов и основных JS-файлов.


## v14 — search, recommendations, cleanup
- Removed the Vasya voice-assistant module and its settings/HUD.
- Replaced the fake promo/skeleton preview panel with editable artist shortcuts.
- Search suggestions now include local artist aliases (e.g. `мор` → MORGENSHTERN) and live iTunes artist/song results.
- Enabled iTunes in full global search, which was previously explicitly disabled.
- Added a lightweight recommendation row based on saved/favorite listening history with a curated fallback.
- Updated service-worker cache version and removed the deleted voice module from the offline shell.

## v15 — магазин и монеты
- Новый раздел «Магазин»: рамки аватарки, анимированные фоны, шапки, эффекты по всему сайту (снег, тыквы, ноты, летучие мыши).
- Монеты и покупки хранятся в Supabase; менять баланс можно только через серверные функции.
- Вкладка «★ Админ» видна и работает только для gamemk64@gmail.com (проверка на сервере): поиск по нику, выдача/списание монет.
- Установка: выполнить supabase-shop.sql, положить shop.js рядом с index.html, Ctrl+F5.


## Shop loading fix
- Added timeouts for Supabase SDK/session/catalog requests.
- Prevented endless loading retry loop; failures now show a readable error and a Retry button.
- Scoped inventory query to the signed-in user and only loads active shop items.

### Lyrics search expansion (2026-10-23)
- Added a bounded fallback sweep across the Lyrically/Paxsenix JSON endpoints for Spotify, YouTube, Deezer, QQ Music, NetEase, Kugou, Genius and Musixmatch.
- Kept existing video-ID and metadata-first lookup order; expanded sweep only runs if the primary sources fail.
- Added console diagnostics for provider hits, empty responses, and unavailable endpoints.
- No lyric coverage guarantee: public provider routes and availability can change, and some services may block direct browser requests.


## Karaoke display fixes
- Smooth active-line scrolling and reset scroll position on track changes.
- Added compact mini-screen and lyrics-only display modes.
- Added stale-request protection when tracks change during lyric lookup.
