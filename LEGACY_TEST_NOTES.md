# Karaoke tests

Run the pure parser/timing tests and static architecture regression checks from this directory's parent folder:

```sh
node tests/karaoke-core.test.cjs
node tests/karaoke-static.test.cjs
```

`karaoke-sync.test.js` is an additional browser-console test. Open the player, then paste its contents into DevTools Console; it requires `window.__karaokeTest`, which is exposed by the player for diagnostics. It tests parser and source-time index behavior only. It does not simulate a live YouTube stream or prove that external lyric providers are reachable.

## Добавлено в версии «тайминг + тапы»

```sh
node --test tests/karaoke-tap.test.cjs      # сборка LRC из тапов, выбор лучшего источника, темп по секциям
npm i jsdom && node tests/karaoke-dom.smoke.cjs   # прогон настоящего плеера в jsdom: заливка букв, сдвиг по песням, редактор тапов
```

`window.__karaokeTest` теперь действительно существует (см. конец блока караоке в `index.html`).

## Revision 2 cinematic checks

Run `node tests/karaoke-cinematic.test.cjs` and `node --check karaoke-cinematic.js` to verify the six FX modes and cinematic script syntax. The DOM smoke test requires `jsdom` to be installed locally.
