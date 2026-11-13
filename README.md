# Music Player — Karaoke rebuild

Static browser music player with an improved karaoke timeline, local lyrics archive, and tap-based word timing.

## Run

Open `index.html` through a local web server (recommended) or deploy the folder to a static host. Keep the JavaScript files beside `index.html`.

## Karaoke behavior

- Prefers provider results that contain actual word timestamps.
- For line-only LRC, estimates phrase duration conservatively instead of stretching words across the entire gap to the next line.
- Hides the current phrase after its estimated or source-provided end and shows a pause marker while waiting for the next phrase.
- Does not auto-play plain text without timestamps. Use **Разметить тапами → По словам** to create word start times.
- The local-file vocal activity filter is applied to both line-level and word-level lyrics. It can suppress some instrument-only sections, but it is an additional heuristic, not a vocal-separation model, and cannot guarantee singer-only detection in a full mix. It can also briefly hide quiet vocals; the filter can be switched off.
- YouTube audio is inside a cross-origin iframe, so the page cannot inspect its waveform. YouTube synchronization therefore relies on the lyric source's timestamps and the user's manual calibration.

## Local lyrics library

Lyrics found by providers and manually timed lyrics are stored in IndexedDB on this device. The library can search, delete, export, and import saved entries. No lyric data is uploaded by this local library feature.

## Tests

Requires Node.js 18+:

```sh
npm test
```

Optional DOM smoke tests require the development dependency:

```sh
npm install
npm run test:dom
```
