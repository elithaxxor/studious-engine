// popup.js
// Handles UI for the popup: legal guidance, download progress, and ffmpeg instructions

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('qualityForm');
  const button = form.querySelector('button');
  const spinner = button.querySelector('.spinner');
  const shortcutInput = document.getElementById('shortcut');
  const historyList = document.getElementById('historyList');

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

