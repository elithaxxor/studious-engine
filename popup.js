// popup.js
// Handles UI for the popup: legal guidance, download progress, and ffmpeg instructions

document.addEventListener('DOMContentLoaded', () => {
  // --- Tab UI logic ---
  const tabs = [
    { tab: document.getElementById('tab-proxy'), content: document.getElementById('content-proxy') },
    { tab: document.getElementById('tab-log'), content: document.getElementById('content-log') },
    { tab: document.getElementById('tab-merge'), content: document.getElementById('content-merge') }
  ];
  tabs.forEach(({ tab }, idx) => {
    if (tab) tab.onclick = () => {
      tabs.forEach(({ tab, content }, j) => {
        if (tab) tab.classList.toggle('active', idx === j);
        if (content) content.style.display = idx === j ? '' : 'none';
      });
    };
  });

  // --- Extraction Log UI ---
  const logList = document.getElementById('logList');
  const clearLogBtn = document.getElementById('clearLog');
  let extractionLog = JSON.parse(localStorage.getItem('extractionLog') || '[]');
  function renderLog() {
    if (!logList) return;
    logList.innerHTML = extractionLog.map(msg => `<div>${msg}</div>`).join('');
  }
  renderLog();
  if (clearLogBtn) clearLogBtn.onclick = () => {
    extractionLog = [];
    localStorage.setItem('extractionLog', '[]');
    renderLog();
  };

  // Listen for extraction notifications and log them
  if (chrome && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'notify' && message.message) {
        extractionLog.push(message.message);
        if (extractionLog.length > 100) extractionLog.shift();
        localStorage.setItem('extractionLog', JSON.stringify(extractionLog));
        renderLog();
        showNotification(message.message);
      }
    });
  }

  // --- Segment Merge UI ---
  const segmentListDiv = document.getElementById('segmentList');
  const mergeBtn = document.getElementById('mergeSegments');
  const mergeStatus = document.getElementById('mergeStatus');
  let segments = JSON.parse(localStorage.getItem('segmentsToMerge') || '[]');
  let protocol = localStorage.getItem('segmentsProtocol') || 'HLS';
  function renderSegments() {
    if (!segmentListDiv) return;
    segmentListDiv.innerHTML = segments.map((s, i) => `<div class='segment-item'>${i + 1}. ${s}</div>`).join('');
  }
  renderSegments();
  if (mergeBtn) mergeBtn.onclick = () => {
    if (!segments.length) {
      if (mergeStatus) mergeStatus.textContent = 'No segments to merge.';
      return;
    }
    mergeStatus.textContent = 'Merging...';
    // Electron integration
    if (window && window.require) {
      // Electron context
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.once('merge_complete', (_, filePath) => {
        mergeStatus.textContent = `Merged! Saved to ${filePath}`;
      });
      ipcRenderer.once('merge_error', (_, err) => {
        mergeStatus.textContent = `Error: ${err}`;
      });
      ipcRenderer.send('download_segments_and_merge', { segments, protocol });
    } else {
      mergeStatus.textContent = 'Feature only available in Electron app.';
    }
  };

  // --- Proxy Management UI ---
  const proxyListDiv = document.getElementById('proxyList');
  const newProxyInput = document.getElementById('newProxy');
  const addProxyBtn = document.getElementById('addProxy');
  const saveBtn = document.getElementById('saveProxies');
  const status = document.getElementById('status');

  let proxies = [];

  if (proxyListDiv && addProxyBtn && saveBtn && newProxyInput) {
    chrome.runtime.sendMessage({ action: 'loadProxies' }, (resp) => {
      proxies = Array.isArray(resp?.proxies) ? resp.proxies : [];
      renderList();
    });
  }

  function renderList() {
    if (!proxyListDiv) return;
    proxyListDiv.innerHTML = '';
    proxies.forEach((proxy, idx) => {
      const div = document.createElement('div');
      div.className = 'proxy-item';
      const input = document.createElement('input');
      input.value = proxy;
      input.onchange = (e) => proxies[idx] = e.target.value;
      const del = document.createElement('button');
      del.textContent = 'Delete';
      del.onclick = () => { proxies.splice(idx, 1); renderList(); };
      div.appendChild(input);
      div.appendChild(del);
      proxyListDiv.appendChild(div);
    });
  }

  if (addProxyBtn) addProxyBtn.onclick = () => {
    const val = newProxyInput.value.trim();
    if (val) {
      proxies.push(val);
      newProxyInput.value = '';
      renderList();
    }
  };

  if (saveBtn) saveBtn.onclick = () => {
    chrome.runtime.sendMessage({ action: 'saveProxies', proxies }, (resp) => {
      if (status) {
        status.textContent = resp && resp.ok ? 'Saved!' : 'Error';
        setTimeout(() => status.textContent = '', 1500);
      }
    });
  };

  const form = document.getElementById('qualityForm');
  if (!form) return;
  const button = form.querySelector('button');
  if (!button) return;
  const spinner = button.querySelector('.spinner');
  if (!spinner) return;

  // Show legal warning
  const warning = document.createElement('div');
  warning.className = 'text-xs text-red-400 my-2';
  warning.innerHTML = '<b>Warning:</b> Downloading videos may violate site terms. Use this tool only for content you have rights to.';
  form.parentNode.insertBefore(warning, form.nextSibling);

  // Listen for download progress notifications
  if (chrome && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'notify' && message.message) {
        showNotification(message.message);
      }
    });
  }

  // Save quality setting (future-proof, not yet used for Vimeo HLS)
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    spinner.style.display = 'inline-block';
    setTimeout(() => {
      spinner.style.display = 'none';
      showNotification('Quality preference saved (feature coming soon).');
    }, 800);
  });
});

function showNotification(msg) {
  let notif = document.getElementById('popup-notif');
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'popup-notif';
    notif.className = 'bg-gray-900 text-green-300 p-2 mt-3 rounded text-xs';
    document.body.appendChild(notif);
  }
  notif.textContent = msg;
  notif.style.display = 'block';
  setTimeout(() => notif.style.display = 'none', 7000);
}
