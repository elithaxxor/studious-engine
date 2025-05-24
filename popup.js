// popup.js
// Handles UI for the popup: legal guidance, download progress, and ffmpeg instructions

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('qualityForm');
  const button = form.querySelector('button');
  const spinner = button.querySelector('.spinner');
  const shortcutInput = document.getElementById('shortcut');

  const historyList = document.getElementById('historyList');

  const folderInput = document.getElementById('folder');
  const historyList = document.getElementById('historyList');
  const clearHistory = document.getElementById('clearHistory');


  const warning = document.createElement('div');
  warning.className = 'text-xs text-red-400 my-2';
  warning.innerHTML = '<b>Warning:</b> Downloading videos may violate site terms. Use only content you own.';
  form.parentNode.insertBefore(warning, form.nextSibling);


  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'notify' && message.message) showNotification(message.message);
  });

  chrome.storage.sync.get({ preferredQuality: '720p', shortcut: 'Ctrl+L' }, (prefs) => {
    document.querySelector(`input[name="quality"][value="${prefs.preferredQuality}"]`).checked = true;
    shortcutInput.value = prefs.shortcut;
  });

  loadHistory(historyList);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    spinner.style.display = 'inline-block';
    const selectedQuality = document.querySelector('input[name="quality"]:checked').value;
    const shortcut = shortcutInput.value || 'Ctrl+L';
    chrome.storage.sync.set({ preferredQuality: selectedQuality, shortcut }, () => {
      spinner.style.display = 'none';
      showNotification('Settings saved');
      loadHistory(historyList);

  // Load saved settings
  chrome.storage.sync.get(['preferredQuality','preferredFormat','triggerKey','downloadFolder'], (res) => {
    const quality = res.preferredQuality || '720p';
    const format = res.preferredFormat || 'mp4';
    const trigger = res.triggerKey || 'Ctrl+L';
    const folder = res.downloadFolder || '';
    const qRadio = document.querySelector(`input[name="quality"][value="${quality}"]`);
    const fRadio = document.querySelector(`input[name="format"][value="${format}"]`);
    if (qRadio) qRadio.checked = true;
    if (fRadio) fRadio.checked = true;
    shortcutInput.value = trigger;
    folderInput.value = folder;
  });

  chrome.storage.local.get({downloadHistory: []}, data => {
    renderHistory(data.downloadHistory);
  });

  // Listen for download progress notifications
  if (chrome && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'notify' && message.message) {
        showNotification(message.message);
      }
    });
  }

  // Save settings
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    spinner.style.display = 'inline-block';
    const quality = document.querySelector('input[name="quality"]:checked').value;
    const format = document.querySelector('input[name="format"]:checked').value;
    const trigger = shortcutInput.value || 'Ctrl+L';
    const folder = folderInput.value.trim();
    chrome.storage.sync.set({preferredQuality: quality, preferredFormat: format, triggerKey: trigger, downloadFolder: folder}, () => {
      setTimeout(() => {
        spinner.style.display = 'none';
        showNotification('Preferences saved.');
      }, 500);
    });
  });

  clearHistory.addEventListener('click', () => {
    chrome.storage.local.set({downloadHistory: []}, () => {
      renderHistory([]);

    });
  });
});

function loadHistory(list) {
  list.innerHTML = '';
  chrome.storage.local.get({ history: [] }, (res) => {
    res.history.slice().reverse().forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = 'my-1 flex justify-between';
      const name = document.createElement('span');
      name.textContent = item.filename;
      const btn = document.createElement('button');
      btn.textContent = '↺';
      btn.className = 'text-blue-400 text-xs';
      btn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'queueDownload', item });
      });
      li.appendChild(name);
      li.appendChild(btn);
      list.appendChild(li);
    });
  });
}

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



function renderHistory(items) {
  historyList.innerHTML = '';
  items.forEach(it => {
    const li = document.createElement('li');
    const date = new Date(it.date).toLocaleString();
    li.textContent = `${date} - ${it.filename || it.url}`;
    historyList.appendChild(li);
  });
}

