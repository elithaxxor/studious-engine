# Future Feature Ideas

1. **Automatic Format Selection**



   - Detect available video qualities and let users choose preferred formats (MP4, WebM, HLS).
   - Remember the last selected format per site.
2. **Batch Download Queue**
   - Maintain a queue of video URLs and download them one after another to prevent multiple parallel downloads.
   - Provide pause and resume controls.
3. **Download History Panel**
   - Store a list of completed downloads with filenames and timestamps.
   - Allow re-download or copying the original URL from history.
4. **Configurable Keyboard Shortcut**
   - Let users change the trigger key via options, defaulting to Ctrl+L.
   - Display the active shortcut in the popup.
5. **Improved Error Reporting**
   - Surface clear messages in the popup with possible fixes when extraction fails.
   - Offer a link to a troubleshooting guide.

## Additional Enhancements
- **FFmpeg Integration** – Optionally merge HLS or DASH segments directly after download using a WebAssembly build of ffmpeg.
- **Custom Save Locations** – Remember different folders for each site or quality level.
- **Multi-browser Support** – Ensure compatibility with Firefox and Edge manifests.





   - Detect available video qualities and allow the user to choose preferred formats (MP4, WebM).
2. **Batch Download Queue**
   - Queue multiple video URLs for sequential downloading to avoid overwhelming the browser.
3. **Download History Panel**
   - Track completed downloads and allow re-downloading without re-parsing the webpage.
4. **Configurable Keyboard Shortcut**
   - Allow users to customize the trigger key instead of using the fixed Ctrl+L.
5. **Improved Error Reporting**
   - Provide detailed error messages and troubleshooting steps in the popup UI.

6. **FFmpeg Integration**
   - Use ffmpeg.wasm to merge downloaded HLS/DASH segments directly in the browser.
7. **Multi-browser Support**
   - Maintain manifests for Firefox and Edge to ensure compatibility.
8. **Test Suite**
   - Automate extraction tests with Puppeteer to prevent regressions.




6. **FFmpeg Integration**
   - Use a WebAssembly build of ffmpeg to optionally merge downloaded HLS or DASH segments directly in the browser after download completes.
7. **Custom Save Locations**
   - Remember different folders for each site or quality level so downloads are automatically organized.
8. **Multi-browser Support**
   - Provide alternate manifests for Firefox and Edge to ensure cross-browser compatibility.


Additional possibilities include automatic subtitle fetching and a scheduled download mode to queue content during off-peak hours.


