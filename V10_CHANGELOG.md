# v10 — custom interface update

- Removed `lyrics-api.example.js` from the runtime package because the site never loads it.
- Removed references to missing `manifest.webmanifest` and `icon-192.png`.
- Added a smooth right-click customization menu.
- Added free dragging of the main UI panels with saved positions.
- Added resettable layout positions.
- Added theme-aware dynamic visual art and cover placeholders.
- Replaced visible sticker-like volume/feature glyphs with the existing vector icon system where possible.
- Added a YouTube ad status overlay that mutes ads and shows `Реклама 1/1`, then `Реклама 1/2` / `Реклама 2/2` when an ad pod exposes or reveals two ads.
- Added remaining-ad time/progress display.
- Kept the existing post-ad restart behavior: content starts from 0:00 after the ad.
- No attempt is made to bypass or remove platform ads.
