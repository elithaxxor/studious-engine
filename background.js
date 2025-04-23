///The background script listens for messages from the content script and initiates the download process.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'download') {
    const url = new URL(message.url);
    const pathname = url.pathname;
    const filename = pathname.substring(pathname.lastIndexOf('/') + 1) || 'video.mp4';
    chrome.downloads.download({
      url: message.url,
      filename: filename,
      saveAs: true
    });
  }
});
