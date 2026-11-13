# Navigation fix — Settings and People

## Fixed
- The top-right gear now opens the actual Settings page instead of only opening the appearance popup.
- The appearance popup is closed when navigating to Settings.
- The base renderer no longer falls through to the DJ ROOM/Equalizer renderer for `set` and `people` views; v12.js can render those views without the DJ interface overwriting them.
- Navigation click handling uses `closest('button[data-v]')`, so nested content inside a navigation button does not break navigation.

## Verification
- `tests/navigation-settings-people.test.cjs`: PASS
- `tests/dj-room-ultimate.test.cjs`: PASS
- `tests/karaoke-core.test.cjs`: PASS (15/15)
- `tests/karaoke-sync.test.cjs` + `tests/karaoke-tap.test.cjs`: PASS (18/18)

Browser/Android manual verification was not available in this execution environment.
