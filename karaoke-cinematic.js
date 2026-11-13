# Karaoke synchronization repair

## What changed
- Removed the synthetic `+40 ms` / `+60 ms` lead that was being added to every source clock reading.
- Uses the current source clock (`YouTube IFrame Player API getCurrentTime()` or HTML media `currentTime`) and applies only the user's calibration offset.
- Positive calibration now means **lyrics later**, negative means **lyrics earlier**; range is -2000..+2000 ms.
- Synchronization is updated from the already-running karaoke animation frame rather than a second 45 ms polling timer. On tab return/focus, the source clock is sampled again.
- For ordinary line-timed LRC, estimated word timings now end based on text/estimated phrase duration instead of stretching every last word to the next lyric line. Long timestamp-supported gaps display `♪ Пауза — ждём следующую строку` and no stale word remains marked as currently sung.
- Exact word timing uses supplied word ends where available; missing ends are bounded to a short inferred interval.
- At the end of the media, lyric highlights are cleared instead of sticking to the final word.
- Added Node.js tests for timing parsing, estimated word intervals, pause inference, source-time seeking, and calibration direction.

## Important limitation
A YouTube iframe does not expose the decoded audio waveform to the parent page. A web page cannot reliably detect that the **singer** has stopped while instrumental music continues just by reading the iframe clock. This repair marks pauses inferred from the lyric timestamps; it does not claim voice-activity detection. Ordinary LRC still has line timestamps only, so word-level highlighting is an estimate. True voice pause detection would require a vocal-separated audio stream or a permitted audio-analysis pipeline.

## Tests
Run from this directory with Node.js 18+:

```sh
node --test tests/karaoke-sync.test.cjs
```

Browser-level playback testing still depends on running the project in a browser with working YouTube and lyric-provider network access.
