// Add to existing content.js (extractVideoURLs)
let currentVideoURLs = [];
let streamingInfo = null;

let preferredQuality = '720p';
let shortcutKey = 'Ctrl+L';
let hoverVideo = null;

chrome.storage.sync.get(['preferredQuality', 'shortcut'], (res) => {
  if (res.preferredQuality) preferredQuality = res.preferredQuality;
  if (res.shortcut) shortcutKey = res.shortcut;
});

function matchesShortcut(e) {
  const parts = shortcutKey.split('+');
  const key = parts.pop();
  const mods = parts.map(p => p.toLowerCase());
  if (key.toLowerCase() !== e.key.toLowerCase()) return false;
  if (mods.includes('ctrl') && !e.ctrlKey) return false;
  if (mods.includes('alt') && !e.altKey) return false;
  if (mods.includes('shift') && !e.shiftKey) return false;
  return true;
}

function attachVideoListeners(video) {
  video.addEventListener('mouseenter', () => hoverVideo = video);
  video.addEventListener('mouseleave', () => { if (hoverVideo === video) hoverVideo = null; });
}

function initVideoTracking() {
  document.querySelectorAll('video').forEach(v => attachVideoListeners(v));
  new MutationObserver((mutations) => {
    mutations.forEach(m => m.addedNodes.forEach(node => {
      if (node.tagName === 'VIDEO') attachVideoListeners(node);
    }));
  }).observe(document.body, { childList: true, subtree: true });
  document.addEventListener('keydown', (e) => {
    if (hoverVideo && matchesShortcut(e)) {
      e.preventDefault();
      extractVideoURLs();
    }
  });
}

initVideoTracking();


let preferredQuality = '720p';
let preferredFormat = 'mp4';
let triggerKey = 'Ctrl+L';
let downloadFolder = '';

chrome.storage.sync.get(['preferredQuality','preferredFormat','triggerKey','downloadFolder'], (res) => {
  if (res.preferredQuality) preferredQuality = res.preferredQuality;
  if (res.preferredFormat) preferredFormat = res.preferredFormat;
  if (res.triggerKey) triggerKey = res.triggerKey;
  if (res.downloadFolder) downloadFolder = res.downloadFolder;
});

let hoveredVideo = null;
document.addEventListener('mouseenter', (e) => {
  if (e.target.tagName === 'VIDEO') hoveredVideo = e.target;
}, true);
document.addEventListener('mouseleave', (e) => {
  if (e.target === hoveredVideo) hoveredVideo = null;
}, true);

document.addEventListener('keydown', async (e) => {
  if (matchesShortcut(e) && hoveredVideo) {
    currentVideoURLs = [];
    await extractVideoURLs();
    const chosen = selectPreferred(currentVideoURLs);
    if (!chosen) {
      chrome.runtime.sendMessage({action:'notify',message:'No downloadable video found'});
      return;
    }
    const filename = buildFilename(chosen);
    chrome.runtime.sendMessage({action:'queueDownload', url: chosen.url, filename});
    addToHistory(chosen.url, filename);
  }
});



async function extractVideoURLs() {
  // ... existing code ...
  if (streamingInfo) {
      if (streamingInfo.protocol === 'HLS') {
          await fetchHLSSegments(streamingInfo.url);
      } else if (streamingInfo.protocol === 'DASH') {
          await fetchDASHSegments(streamingInfo.url);
      }
  }
// Add to extractVideoURLs in content.js
// 1. Vimeo HLS extraction
if (window.location.hostname.includes('vimeo.com')) {
  try {
    // Attempt to find the player config JSON which contains the HLS URL
    let hlsUrl = null;
    // 1. Try window.vimeo.clip_page_config (modern Vimeo)
    if (window.vimeo && window.vimeo.clip_page_config) {
      hlsUrl = window.vimeo.clip_page_config.player?.hls?.url;
    }
    // 2. Fallback: Look for JSON in <script> tags
    if (!hlsUrl) {
      const scripts = document.getElementsByTagName('script');
      for (let script of scripts) {
        if (script.textContent.includes('"hls":')) {
          const match = script.textContent.match(/({.*"hls":\{"url":"(https:[^\"]+\.m3u8)[^}]+\}).*}/);
          if (match && match[2]) {
            hlsUrl = match[2].replace(/\\/g, '');
            break;
          }
        }
      }
    }
    if (hlsUrl) {
      // Start HLS segment fetching
      await fetchHLSSegments(hlsUrl);
      return;
    } else {
      console.warn('Vimeo HLS playlist URL not found.');
    }
  } catch (e) {
    console.error('Error extracting Vimeo HLS URL:', e);
  }
}
// 2. YouTube extraction (progressive/mp4)
else if (window.location.hostname.includes('youtube.com')) {
  try {
    // Look for ytInitialPlayerResponse in <script> tags
    let found = false;
    const scripts = document.getElementsByTagName('script');
    for (let script of scripts) {
      if (script.textContent.includes('ytInitialPlayerResponse')) {
        const match = script.textContent.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/);
        if (match) {
          try {
            const config = JSON.parse(match[1]);
            const streams = config.streamingData?.formats || [];
            streams.forEach(stream => {
              if (stream.mimeType && stream.url) {
                const fmt = stream.mimeType.includes('webm') ? 'webm' : 'mp4';
                currentVideoURLs.push({
                  quality: stream.qualityLabel,
                  url: stream.url,
                  format: fmt
                });
              }
            });
            found = true;
          } catch (e) { console.error('YouTube JSON parse error:', e); }
        }
      }
    }
    if (!found) console.warn('YouTube: No downloadable streams found.');
  } catch (e) { console.error('YouTube extraction error:', e); }
}
// 3. Dailymotion extraction
else if (window.location.hostname.includes('dailymotion.com')) {
  const scripts = document.getElementsByTagName('script');
  for (let script of scripts) {
      if (script.textContent.includes('__PLAYER_CONFIG__')) {
          const match = script.textContent.match(/__PLAYER_CONFIG__\s*=\s*({.+?});/);
          if (match) {
              try {
                  const config = JSON.parse(match[1]);
                  const qualities = config.metadata?.qualities || {};
                  Object.keys(qualities).forEach(quality => {
                      qualities[quality].forEach(source => {
                          if (source.type && source.url) {
                              const fmt = source.type.includes('webm') ? 'webm' : 'mp4';
                              currentVideoURLs.push({
                                  quality: quality + 'p',
                                  url: source.url,
                                  format: fmt
                              });
                          }
                      });
                  });
              } catch (e) {
                  console.error('Error parsing Dailymotion data:', e);
              }
          }
      }
  }
}
// Pornhub extraction
else if (window.location.hostname.includes('pornhub.com')) {
  try {
    const scripts = document.getElementsByTagName('script');
    for (let script of scripts) {
      if (script.textContent.includes('mediaDefinitions') || script.textContent.includes('flashvars')) {
        const mediaMatch = script.textContent.match(/mediaDefinitions\s*[:=]\s*(\[.*?\])/s);
        const flashMatch = script.textContent.match(/flashvars[^=]*=\s*(\{.*?\});/s);
        let defs = null;
        if (mediaMatch) {
          try { defs = JSON.parse(mediaMatch[1].replace(/'/g, '"')); } catch {}
        } else if (flashMatch) {
          try { const obj = JSON.parse(flashMatch[1]); defs = obj.mediaDefinitions; } catch {}
        }
        if (defs && Array.isArray(defs)) {
          defs.forEach(d => {
            const url = d.videoUrl || d.url;
            if (url && (url.includes('.mp4') || url.includes('.m3u8'))) {

              currentVideoURLs.push({ quality: d.quality || 'unknown', url });


              const fmt = url.includes('.m3u8') ? 'hls' : 'mp4';
              currentVideoURLs.push({ quality: d.quality || 'unknown', url, format: fmt });

              currentVideoURLs.push({ quality: d.quality || 'unknown', url });


            }
          });
        } else {
          const urlMatches = script.textContent.match(/https?:[^"']+\.(?:mp4|m3u8)[^"']*/g);
          if (urlMatches) {

            urlMatches.forEach(u => currentVideoURLs.push({ quality: 'unknown', url: u.replace(/\\/g, '') }));


            urlMatches.forEach(u => currentVideoURLs.push({ quality: 'unknown', url: u.replace(/\\/g, ''), format: u.includes('.m3u8') ? 'hls' : 'mp4' }));

            urlMatches.forEach(u => currentVideoURLs.push({ quality: 'unknown', url: u.replace(/\\/g, '') }));


          }
        }
        if (currentVideoURLs.length) break;
      }
    }
    if (currentVideoURLs.length === 0) {
      console.warn('Pornhub: no downloadable URLs found.');
    }
  } catch (e) { console.error('Pornhub extraction error:', e); }
}
// 4. Twitch HLS extraction (basic)
else if (window.location.hostname.includes('twitch.tv')) {
  try {
    // Twitch HLS manifests are often in network requests, but for demo, look for m3u8 in scripts
    let hlsUrl = null;
    const scripts = document.getElementsByTagName('script');
    for (let script of scripts) {
      if (script.textContent.includes('.m3u8')) {
        const match = script.textContent.match(/(https:[^\"]+\.m3u8)/);
        if (match && match[1]) {
          hlsUrl = match[1];
          break;
        }
      }
    }
    if (hlsUrl) {
      await fetchHLSSegments(hlsUrl);
      return;
    } else {
      console.warn('Twitch: HLS playlist not found.');
    }
  } catch (e) { console.error('Twitch extraction error:', e); }
}
// 5. Generic <video> tag fallback
else {
  try {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      if (video.src) {
        const fmt = video.src.includes('.webm') ? 'webm' : 'mp4';
        currentVideoURLs.push({ quality: 'unknown', url: video.src, format: fmt });
      } else if (video.querySelector('source')) {
        const source = video.querySelector('source');
        if (source && source.src) {
          const fmt = source.src.includes('.webm') ? 'webm' : 'mp4';
          currentVideoURLs.push({ quality: 'unknown', url: source.src, format: fmt });
        }
      }
    });
    if (currentVideoURLs.length === 0) {
      console.warn('No <video> sources found on page.');
    }
  } catch (e) { console.error('Generic <video> extraction error:', e); }
}


  if (currentVideoURLs.length > 0 && !streamingInfo) {
    const match = currentVideoURLs.find(v => v.quality === preferredQuality) || currentVideoURLs[0];
    const name = match.url.split('/').pop().split('?')[0] || 'video.mp4';
    chrome.runtime.sendMessage({
      action: 'queueDownload',
      item: { url: match.url, filename: name }
    });
  } else if (!streamingInfo) {
    chrome.runtime.sendMessage({ action: 'notify', message: 'No downloadable video found on this page.' });
  }

}


async function fetchHLSSegments(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network error');
      const text = await response.text();
      const lines = text.split('\n');
      const segments = lines.filter(line => line.includes('.ts') && !line.startsWith('#'))
        .map(line => new URL(line, url).href);
      if (segments.length > 0) {
        // Notify background to start download and show progress
        chrome.runtime.sendMessage({
          action: 'downloadSegments',
          segments: segments,
          protocol: 'HLS'
        });
        // Notify user with ffmpeg instruction after download
        chrome.runtime.sendMessage({
          action: 'notify',
          message: `HLS segments fetched. To merge, use: ffmpeg -i "${url}" -c copy output.mp4\nDownloaded ${segments.length} segments.`
        });
        return;
      }
      throw new Error('No segments found');
    } catch (e) {
      if (attempt === retries) {
        chrome.runtime.sendMessage({
          action: 'notify',
          message: `Failed to fetch HLS segments after ${retries} attempts: ${e.message}`
        });
      }
    }
  }
}


async function fetchDASHSegments(url) {
  try {
      const response = await fetch(url);
      const text = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'application/xml');
      const segments = Array.from(xml.querySelectorAll('SegmentURL')).map(seg => seg.getAttribute('media'));
      if (segments.length > 0) {
          chrome.runtime.sendMessage({
              action: 'downloadSegments',
              segments: segments.map(seg => new URL(seg, url).href),
              protocol: 'DASH'
          });
      } else {
          chrome.runtime.sendMessage({
              action: 'notify',
              message: 'DASH segments not found. Use ffmpeg with: ffmpeg -i "' + url + '" output.mp4'
          });
      }
  } catch (e) {
      chrome.runtime.sendMessage({
          action: 'notify',
          message: 'Failed to fetch DASH segments: ' + e.message
      });
  }
}


function matchesShortcut(e) {
  const parts = triggerKey.split('+');
  const key = parts.pop().toLowerCase();
  const mod = parts.join('+').toLowerCase();
  if (mod === 'ctrl') return e.ctrlKey && e.key.toLowerCase() === key;
  if (mod === 'alt') return e.altKey && e.key.toLowerCase() === key;
  if (mod === 'shift') return e.shiftKey && e.key.toLowerCase() === key;
  if (mod === 'ctrl+shift') return e.ctrlKey && e.shiftKey && e.key.toLowerCase() === key;
  return false;
}

function selectPreferred(list) {
  let filtered = list.filter(v => v.format && v.format.toLowerCase().includes(preferredFormat.toLowerCase()));
  if (preferredQuality) filtered = filtered.filter(v => v.quality === preferredQuality);
  return filtered[0] || list[0];
}

function buildFilename(item) {
  let name = item.url.split('/').pop().split('?')[0];
  if (!name.includes('.')) name += '.' + (item.format || 'mp4');
  if (downloadFolder) return downloadFolder.replace(/\/$/, '') + '/' + name;
  return name;
}

function addToHistory(url, filename) {
  chrome.storage.local.get({downloadHistory: []}, data => {
    const history = data.downloadHistory;
    history.unshift({url, filename, date: Date.now()});
    chrome.storage.local.set({downloadHistory: history.slice(0, 50)});
  });

}

});


