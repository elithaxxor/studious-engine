# Changelog

## 2025-05-20 01:38 EDT

### Added
- **Multi-site support in content.js:**
  - **YouTube:** Extracts downloadable MP4 streams from scripts.
  - **Dailymotion:** Extracts MP4 qualities from embedded JSON.
  - **Twitch:** Attempts to extract HLS (.m3u8) playlists from scripts.
  - **Generic fallback:** Downloads from any <video> or <source> element found on the page.
- Improved error handling and user notifications for each supported site.

### Changed
- Updated README to document multi-site support and extraction logic.

### Security
- Maintains user-initiated download policy and local merging guidance.

---
