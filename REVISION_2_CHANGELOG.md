# Karaoke lyrics fix

- Added Scally Milano artist aliases (Scally Milano / Скалли Милано / Скалли Милана), title-only fallback variants, and expanded search variant count.
- Added source diagnostics to the console and source label in the existing karaoke hint.
- Added “Исправить текст” editor shortcut and “Другой источник” retry button that rotates provider priority.
- Added persistent synchronization calibration slider (−1500…+1500 ms) saved in localStorage.
- Existing manual LRC/TXT paste/upload fallback remains and opens automatically when lookup fails.
- Validated all 31 inline JavaScript blocks with Node.js syntax check and verified ZIP integrity.
- Lyrics availability still depends on external catalogues and provider APIs; no full coverage is guaranteed.

## Дополнение: расширенный поиск текстов
- Добавлен резервный поиск через публичные JSON-маршруты Lyrically/Paxsenix для Spotify, YouTube, Deezer, QQ Music, NetEase, Kugou, Genius и Musixmatch.
- Расширенный поиск запускается после основных источников, ограничивает число запросов и проверяет ответы на наличие пригодных текстов/таймингов.
- Отладка пишет в консоль успешные ответы, пустые ответы и недоступные источники.
- Это не гарантирует нахождение новых или редких песен: публичные API могут менять маршруты, иметь лимиты, CORS-ограничения или не содержать текст конкретного трека.
