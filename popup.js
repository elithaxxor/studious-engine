// popup.js
// Handles UI for the popup: legal guidance, download progress, and ffmpeg instructions

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('qualityForm');
  const button = form.querySelector('button');
  const spinner = button.querySelector('.spinner');

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
