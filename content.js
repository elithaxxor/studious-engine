// The content script runs on every webpage, detecting when the user hovers over a video and presses Ctrl+L. It also handles dynamically loaded videos.

let isHoveringVideo = false;
let currentVideoURL = '';

function attachVideoListeners(video) {
  video.addEventListener('mouseenter', () => {
    isHoveringVideo = true;
    currentVideoURL = video.src;
  });
  video.addEventListener('mouseleave', () => {
    isHoveringVideo = false;
    currentVideoURL = '';
  });
}

// Attach listeners to existing videos
document.querySelectorAll('video').forEach(attachVideoListeners);

// Observe for dynamically added videos
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes) {
      mutation.addedNodes.forEach((node) => {
        if (node.tagName === 'VIDEO') {
          attachVideoListeners(node);
        } else if (node.querySelectorAll) {
          node.querySelectorAll('video').forEach(attachVideoListeners);
        }
      });
    }
  });
});
observer.observe(document.body, { childList: true, subtree: true });

// Listen for keyboard shortcut
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.key === 'l' && isHoveringVideo) {
    chrome.runtime.sendMessage({ action: 'download', url: currentVideoURL });
  }
});
