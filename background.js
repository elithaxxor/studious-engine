/* background.js
Listens for downloadSegments messages and downloads each segment using chrome.downloads.download.
Notifies the user via chrome.notifications.create.
No obvious errors in the shown code. */ 



// Add to existing background.js
const api = window.browser || window.chrome;

api.runtime.onMessage.addListener((message) => {
  // HLS or DASH segment download handler
  if (message.action === 'downloadSegments') {
    message.segments.forEach((segment, index) => {
      api.downloads.download({
        url: segment,
        filename: `video_segment_${index}.${message.protocol === 'HLS' ? 'ts' : 'm4s'}`,
        saveAs: false
      });
    });
    let mergeMsg = '';
    if (message.protocol === 'DASH') {
      mergeMsg = 'DASH videos often have separate audio and video files. After download, merge them with:\nffmpeg -i video.mp4 -i audio.mp4 -c copy output.mp4';
    } else {
      mergeMsg = `Downloading ${message.protocol} segments. After all downloads complete, merge them with:\nffmpeg -i "playlist.m3u8" -c copy output.mp4\nOr use the original .m3u8 URL.`;
    }
    api.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Video Downloader',
      message: mergeMsg
    });
  }
  // User notification handler
  if (message.action === 'notify' && message.message) {
    api.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Video Downloader',
      message: message.message
    });
  }
  // ... existing handlers ...
});

// --- Session/Cookie and webRequest logic for authenticated videos ---
// Example: Listen for requests to Reddit video/audio and log cookies (for advanced extraction)
try {
  if (api.webRequest && api.cookies) {
    api.webRequest.onCompleted.addListener(
      function(details) {
        if (details.url.includes('v.redd.it') || details.url.includes('.mpd')) {
          api.cookies.getAll({domain: '.reddit.com'}, function(cookies) {
            // You can use these cookies for authenticated fetches if needed
            // Optionally, send these back to the content script or use for XHR/fetch
            api.runtime.sendMessage({
              action: 'sessionCookies',
              cookies: cookies,
              url: details.url
            });
          });
        }
      },
      {urls: ["<all_urls>"]},
      []
    );
  }
} catch (e) {
  // Some browsers may not support all APIs
  console.warn('Session/cookie/webRequest integration error:', e);
}