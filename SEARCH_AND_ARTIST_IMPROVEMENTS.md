# Music Player Karaoke Cinematic — revision 2

## Changes
- Added a persistent FX mode selector: CINEMATIC, NEON, AURORA, PARTICLES, PULSE, DYNAMIC. Existing FX MAX / FX LITE remains available.
- Effects use analyser frequency bins split into low, mid and high bands when local audio analyser data is available. The YouTube iframe does not expose decoded audio to the parent page; visual fallback remains clock-driven and is not presented as measured audio.
- Limited particle updates to particle-rich modes and kept the existing bounded particle pool.
- Reduced the minimum frame delta clamp to zero so background-tab pauses do not cause artificial simulation jumps.
- Bumped service-worker cache version to ensure clients load the revised cinematic script.
- Added regression assertions for modes and frequency-band analysis.

## Verification
Passed on Node.js 22:
- `node tests/karaoke-cinematic.test.cjs`
- `node tests/karaoke-static.test.cjs`
- `node tests/karaoke-core.test.cjs` (15/15)
- `node --test tests/karaoke-sync.test.cjs` (6/6)
- `node --test tests/karaoke-tap.test.cjs` (12/12)
- `node --check karaoke-cinematic.js`

`node tests/karaoke-dom.smoke.cjs` was not run successfully because `jsdom` is not installed in the environment. Browser playback checks involving YouTube and external lyric providers still require a browser/network session.

## Run
Serve the `karaoke_syllable` directory over HTTP (recommended, for example `python -m http.server 8000`) and open `http://localhost:8000`. Some browser APIs and service-worker features do not work correctly from `file://`.
