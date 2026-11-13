# Karaoke rebuild notes

## Timing engine
- Added a separate, unit-tested timeline engine.
- Line-only LRC now gets a conservative phrase window based on local singing-rate estimates; long gaps are not used as the duration of the previous phrase.
- Word-level source timestamps are preserved, missing ends are bounded, and pauses between words/phrases clear the current highlight.
- Plain text without timing metadata is not automatically displayed as live karaoke.
- Partial tap sessions are no longer padded with invented timings and cannot be saved as exact word synchronization.

## Voice activity
- Added an optional conservative analyser-based vocal-likelihood filter for imported local audio files.
- The filter is a heuristic, not vocal separation. It may suppress some instrumental sections but cannot perfectly distinguish a singer from instruments in a full mix.
- YouTube iframe audio is not exposed to the parent page; for YouTube the player uses source timing and manual calibration only.

## Local lyrics database
- Added an IndexedDB archive for provider results and manual timings.
- The archive is searched before remote providers, making previously found lyrics available offline.
- Added search, delete, JSON export and JSON import controls.

## Verification
- `npm test` covers timeline edge cases, vocal-gate behavior, database persistence/import/export and integration wiring.
- DOM tests are optional and require `npm install` (`npm run test:dom`).
