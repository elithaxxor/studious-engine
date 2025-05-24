/* background.js
Listens for downloadSegments messages and downloads each segment using chrome.downloads.download.
Notifies the user via chrome.notifications.create.
No obvious errors in the shown code. */ 



// Add to existing background.js
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'downloadSegments') {
      message.segments.forEach((segment, index) => {
          chrome.downloads.download({
              url: segment,
              filename: `video_segment_${index}.${message.protocol === 'HLS' ? 'ts' : 'm4s'}`,
              saveAs: false
          });
      });
      chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'Video Downloader',
          message: `Downloading ${message.protocol} segments. After all downloads complete, merge them with:\nffmpeg -i "playlist.m3u8" -c copy output.mp4\nOr use the original .m3u8 URL.`
      });
  }
  if (message.action === 'notify' && message.message) {
      chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'Video Downloader',
          message: message.message
      });
  }
  // ... existing handlers ...
});
