# Search repair v21

- Added multiple Invidious fallback endpoints after Piped and the optional YouTube Data API.
- Normalized YouTube result metadata and duration filtering. Results shorter than or equal to 30 seconds and obvious Shorts are excluded.
- Apple catalog suggestions now use full track duration metadata and route to global search instead of playing the 30-second preview.
- Public third-party endpoints can change or block browser requests; YouTube API key remains the most reliable option.
