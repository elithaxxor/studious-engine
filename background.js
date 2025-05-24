/* background.js
Listens for downloadSegments messages and downloads each segment using chrome.downloads.download.
Notifies the user via chrome.notifications.create.
No obvious errors in the shown code. */ 



// Add to existing background.js
const queue = [];
let active = false;

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'queueDownload') {
    queue.push(message);
    if (!active) processQueue();
  }
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
