# Changelog

## 2025-05-21
### Added
- Advanced extraction: Intercepts XHR/fetch requests for video/media URLs and recursively scans iframes for embedded sources.
- Automated segment merging: In Electron, segments are downloaded and merged using ffmpeg. In browser, user receives a merge command for ffmpeg.
- UI/UX: Popup now features tabs for Proxy Management, Extraction Log, and Segment Merge. Extraction log tracks all captured URLs and notifications. Segment merge tab allows one-click merging in Electron.
### Added
- Enhanced extraction logic for embedded video players (JWPlayer, Brightcove, Kaltura, Wistia, Dacast) in content.js. Attempts to parse player configs from scripts and extract direct video URLs.
- Expanded README: Added 'Countermeasures for Download Firewalls' section, practical user troubleshooting notes, and legal/ethical guidance. Documented new strategies for hard sites and fallback extraction methods.

## 2025-05-20
### Added
- Advanced Reddit DASH handling: parses all available video/audio qualities, sorts by bandwidth, and notifies user to select best quality for merging.
- Improved merging instructions and UX for Reddit DASH.
- Ongoing: README and documentation improvements for advanced extraction and merging automation.

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
