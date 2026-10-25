# Cinematic Karaoke FX

The immersive karaoke screen now has a separate `karaoke-cinematic.js` layer. It adds a circular spectrum halo, animated orbit rings, frequency ribbons, restrained transient rays, floating particles, bass-responsive cover-art parallax, and a larger entrance animation when the current lyric line changes.

- **FX MAX** is the default and enables the full effect set. **FX LITE** keeps the lyrics and base visualizer but turns off the heavier rings/ribbons/particles. The choice is stored locally.
- Locally playable audio uses the existing Web Audio analyser when readable. YouTube playback cannot be read directly by that analyser, so the visualizer falls back to a playback-clock/lyrics-tempo pulse instead of pretending to measure the actual waveform.
- The service-worker cache key was bumped so the new script is included in the offline shell.
- Validation: karaoke core, static, sync, tap-sync and cinematic integration tests pass. The optional DOM smoke test requires `jsdom`, which is not installed in this environment.
