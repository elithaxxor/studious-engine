// background.js
// Handles downloads sequentially and records history.

const downloadQueue = [];
let isDownloading = false;

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'queueDownload' && message.item) {
    downloadQueue.push(message.item);
    processQueue();
  }
  if (message.action === 'downloadSegments') {
    message.segments.forEach((url, idx) => {
      downloadQueue.push({
        url,
        filename: `segment_${idx}.${message.protocol === 'HLS' ? 'ts' : 'm4s'}`
      });
    });
    processQueue();
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Video Downloader',
      message: `Queued ${message.segments.length} ${message.protocol} segments`
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
});

function processQueue() {
  if (isDownloading || downloadQueue.length === 0) return;
  isDownloading = true;
  const item = downloadQueue.shift();
  chrome.downloads.download({ url: item.url, filename: item.filename, saveAs: false }, (id) => {
    if (chrome.runtime.lastError) {
      chrome.notifications.create({ type: 'basic', iconUrl: 'icon.png', title: 'Download Error', message: chrome.runtime.lastError.message });
      isDownloading = false;
      processQueue();
      return;
    }
    chrome.downloads.onChanged.addListener(function listener(delta) {
      if (delta.id === id && delta.state && delta.state.current === 'complete') {
        chrome.downloads.onChanged.removeListener(listener);
        recordHistory(item.url, item.filename);
        isDownloading = false;
        processQueue();
      }
    });
  });
}

function recordHistory(url, filename) {
  chrome.storage.local.get({ history: [] }, (res) => {
    res.history.push({ url, filename, time: Date.now() });
    chrome.storage.local.set({ history: res.history });
  });
}

