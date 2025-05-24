
// background.js
// Handles downloads sequentially and records history.

/* background.js
Listens for messages to download video segments and optionally merge them.
Provides notifications to guide the user.
*/

// FFmpeg WASM setup for optional merging
let ffmpegInstance = null;
async function mergeSegmentsWithFFmpeg(segments, outputName, protocol) {
    if (!ffmpegInstance) {
        importScripts('ffmpeg.min.js'); // from ffmpeg.wasm
        ffmpegInstance = FFmpeg.createFFmpeg({ log: true });
        await ffmpegInstance.load();
    }
    for (let i = 0; i < segments.length; i++) {
        const res = await fetch(segments[i]);
        ffmpegInstance.FS('writeFile', `part${i}.${protocol === 'HLS' ? 'ts' : 'm4s'}`, new Uint8Array(await res.arrayBuffer()));
    }
    const concatList = segments.map((_, i) => `file part${i}.${protocol === 'HLS' ? 'ts' : 'm4s'}`).join('\n');
    ffmpegInstance.FS('writeFile', 'list.txt', concatList);
    await ffmpegInstance.run('-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', outputName);
    const data = ffmpegInstance.FS('readFile', outputName);
    const blob = new Blob([data.buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({ url, filename: outputName, saveAs: true });
}


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


// Add to existing background.js
const queue = [];
let active = false;

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'queueDownload') {
    queue.push(message);
    if (!active) processQueue();
  }

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message) => {

    if (message.action === 'downloadSegments') {
        chrome.storage.sync.get(['saveLocations', 'autoMerge'], (prefs) => {
            const site = message.site || 'generic';
            const quality = message.quality || 'unknown';
            const folder = (prefs.saveLocations?.[site]?.[quality]) || (prefs.saveLocations?.[site]?._default) || '';
            message.segments.forEach((segment, index) => {
                const filename = `${folder ? folder + '/' : ''}video_segment_${index}.${message.protocol === 'HLS' ? 'ts' : 'm4s'}`;
                chrome.downloads.download({ url: segment, filename, saveAs: false });
            });
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon.png',
                title: 'Video Downloader',
                message: `Downloading ${message.protocol} segments. ${prefs.autoMerge ? 'Merging when done...' : 'Merge with ffmpeg after download.'}`
            });
            if (prefs.autoMerge) {
                mergeSegmentsWithFFmpeg(message.segments, 'merged_output.mp4', message.protocol);
            }
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
    if (message.action === 'setSaveLocation') {
        chrome.storage.sync.get({ saveLocations: {} }, (data) => {
            if (!data.saveLocations[message.site]) data.saveLocations[message.site] = {};
            data.saveLocations[message.site][message.quality || '_default'] = message.path;
            chrome.storage.sync.set({ saveLocations: data.saveLocations });
        });
    }
    if (message.action === 'setAutoMerge') {
        chrome.storage.sync.set({ autoMerge: message.value });
    }
    // ... existing handlers ...


  if (message.action === 'downloadSegments') {
    queue.push({segments: message.segments, protocol: message.protocol, filename: message.filename});
    if (!active) processQueue();
  }
  if (message.action === 'notify' && message.message) {
    chrome.notifications.create({
      type: 'basic', iconUrl: 'icon.png', title: 'Video Downloader', message: message.message

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


  if (queue.length === 0) { active = false; return; }
  active = true;
  const item = queue.shift();
  if (item.segments) {
    downloadSegments(item, () => processQueue());
  } else {
    chrome.downloads.download({url: item.url, filename: item.filename, saveAs: false}, (id) => {
      addHistory(item.url, item.filename);
      processQueue();
    });
  }

}

function downloadSegments(info, done) {
  let i = 0;
  const next = () => {
    if (i >= info.segments.length) { addHistory('Segments', info.filename); return done(); }
    chrome.downloads.download({url: info.segments[i], filename: `seg_${i}.${info.protocol === 'HLS' ? 'ts' : 'm4s'}`, saveAs: false}, () => {
      i++; next();
    });
  };
  next();
}

function addHistory(url, filename) {
  chrome.storage.local.get({downloadHistory: []}, data => {
    const hist = data.downloadHistory;
    hist.unshift({url, filename, date: Date.now()});
    chrome.storage.local.set({downloadHistory: hist.slice(0,50)});
  });
}

  // ... existing handlers ...

});


