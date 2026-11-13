# Search and artist improvements

Changes in this revision:
- Song row's `⋯` menu now offers `Все песни исполнителя: <name>` when metadata contains an artist.
- World-search cards have an artist shortcut; it opens the artist's available full-length tracks across YouTube search and Audius.
- Artist results from Apple/iTunes and local song metadata use the same cross-source lookup flow. Audius artist IDs still use the artist's direct track endpoint.
- Search result requests now use a 7-second fetch timeout before fallback handling; iTunes retains JSONP fallback for browser/CORS failures.
- Existing full-track filtering remains: short videos and iTunes 30-second preview-only items are not treated as full tracks.

## Limitations
A static website cannot force YouTube to be reachable in networks where YouTube is blocked, and it cannot run Windows Zapret `.bat` files on visitors' devices. A server-side search proxy can improve search reliability but does not guarantee YouTube playback; do not expose secret API keys in client code. Use permitted streaming/catalogue sources and display clear source availability errors.

## Validation
- All 36 inline script blocks pass `node --check`.
- Test suite: 22 passed, 1 existing test could not run because `sw.js` is missing from the source archive (the archive contains `sw (2).js`). No claim of live provider/playback testing is made.
