// Add to existing content.js (extractVideoURLs)
async function extractVideoURLs() {
  // Extraction dispatcher logic moved inside this function
  if (window.location.hostname.includes('vimeo.com')) {
    // ... Vimeo extraction ...
  } else if (window.location.hostname.includes('youtube.com')) {
    // ... YouTube extraction ...
  } else if (window.location.hostname.includes('dailymotion.com')) {
    // ... Dailymotion extraction ...
  } else if (window.location.hostname.includes('twitch.tv')) {
    // ... Twitch extraction ...
  } else if (window.location.hostname.includes('facebook.com')) {
    await extractFacebookVideo();
  } else if (window.location.hostname.includes('twitter.com') || window.location.hostname.includes('x.com')) {
    await extractTwitterVideo();
  } else if (window.location.hostname.includes('reddit.com')) {
    await extractRedditVideo();
  } else if (window.location.hostname.includes('instagram.com')) {
    await extractInstagramVideo();
  } else if (window.location.hostname.includes('tiktok.com')) {
    await extractTikTokVideo();
  } else if (document.querySelector('video[data-jwplayer], video[data-brightcove], video[data-kaltura], video[data-wistia]')) {
    await extractEmbeddedPlayerVideo();
  } else {
    // Generic fallback
    try {
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
        if (video.src) {
          if (video.src.startsWith('blob:')) {
            extractBlobURLData(video.src);
          } else {
            currentVideoURLs.push({ quality: 'unknown', url: video.src });
          }
        } else if (video.querySelector('source')) {
          const source = video.querySelector('source');
          if (source && source.src) {
            if (source.src.startsWith('blob:')) {
              extractBlobURLData(source.src);
            } else {
              currentVideoURLs.push({ quality: 'unknown', url: source.src });
            }
          }
        }
      });
      if (currentVideoURLs.length === 0) {
        // Attempt to fetch a known playlist or video manifest if present
        const m3u8 = document.querySelector('a[href$=".m3u8"]');
        const mpd = document.querySelector('a[href$=".mpd"]');
        let manifestUrl = m3u8 ? m3u8.href : (mpd ? mpd.href : null);
        if (manifestUrl) {
          // Try native fetch, CORS bypass, then proxy fetch
          (async () => {
            try {
              await fetch(manifestUrl);
            } catch (e) {
              try {
                await fetchWithCORSBypass(manifestUrl);
              } catch (err) {
                try {
                  let proxyUrl = getNextProxyUrl(manifestUrl);
                  let lastErr;
                  for (let i = 0; i < proxyList.length; i++) {
                    try {
                      await fetch(proxyUrl);
                      chrome.runtime.sendMessage({
                        action: 'notify',
                        message: `CORS bypassed using proxy: ${proxyUrl}`
                      });
                      break;
                    } catch (proxyErr) {
                      lastErr = proxyErr;
                      proxyUrl = getNextProxyUrl(manifestUrl);
                    }
                  }
                  if (lastErr) notifyManualNetworkInspection();
                } catch (proxyErr) {
                  notifyManualNetworkInspection();
                }
              }
            }
          })();
        } else {
          notifyManualNetworkInspection();
        }
        console.warn('No <video> sources found on page.');
      }
    } catch (e) {
      notifyManualNetworkInspection();
      console.error('Generic <video> extraction error:', e);
    }
  }
}

// Only attach browser listeners if running in the browser
if (typeof window !== 'undefined' && window.chrome && window.document) {
  // Listen for session cookies from background (for authenticated fetches)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'sessionCookies' && message.cookies && message.url) {
      window._redditSessionCookies = message.cookies;
      window._redditSessionUrl = message.url;
    }
  });
  if (typeof window !== 'undefined' && typeof document !== 'undefined' && window.document) {
    document.addEventListener('DOMContentLoaded', () => {
      const form = document.getElementById('qualityForm');
      if (!form) return;
      const button = form.querySelector('button');
      const spinner = button.querySelector('.spinner');
      // ... rest of DOMContentLoaded logic ...
    });
  }
}

// Export for unit testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports.extractRedditVideo = extractRedditVideo;
}

// --- Advanced extraction: XHR/fetch/iframe interceptors ---

// Intercept XHR/fetch requests to capture media URLs
(function interceptXHRandFetch() {
  if (typeof window === 'undefined') return;
  const origXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (/\.m3u8$|\.mpd$|\.mp4$|\.ts$|\.m4s$/i.test(url)) {
      window.currentVideoURLs = window.currentVideoURLs || [];
      if (!window.currentVideoURLs.some(v => v.url === url)) {
        window.currentVideoURLs.push({ quality: 'XHR', url });
        if (window.chrome && chrome.runtime) {
          chrome.runtime.sendMessage({ action: 'notify', message: `Captured media URL via XHR: ${url}` });
        }
      }
    }
    return origXHROpen.apply(this, arguments);
  };
  if (window.fetch) {
    const origFetch = window.fetch;
    window.fetch = function() {
      const url = arguments[0];
      if (typeof url === 'string' && /\.m3u8$|\.mpd$|\.mp4$|\.ts$|\.m4s$/i.test(url)) {
        window.currentVideoURLs = window.currentVideoURLs || [];
        if (!window.currentVideoURLs.some(v => v.url === url)) {
          window.currentVideoURLs.push({ quality: 'fetch', url });
          if (window.chrome && chrome.runtime) {
            chrome.runtime.sendMessage({ action: 'notify', message: `Captured media URL via fetch: ${url}` });
          }
        }
      }
      return origFetch.apply(this, arguments);
    };
  }
})();

// Recursively scan iframes for embedded video sources
async function extractFromIframes() {
  const iframes = document.querySelectorAll('iframe');
  for (let iframe of iframes) {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) continue;
      // Look for <video> or <source> in iframe
      const videos = doc.querySelectorAll('video');
      videos.forEach(video => {
        if (video.src) {
          currentVideoURLs.push({ quality: 'iframe', url: video.src });
        } else if (video.querySelector('source')) {
          const source = video.querySelector('source');
          if (source && source.src) currentVideoURLs.push({ quality: 'iframe', url: source.src });
        }
      });
      // Recurse into nested iframes
      await extractFromIframes.call({ document: doc });
    } catch (e) {
      // Ignore cross-origin errors
    }
  }
}

// --- Utility countermeasures for hard sites ---

// Load proxies from proxies.json (synchronously for simplicity)
let proxyList = [
  "https://corsproxy.io/?",
  "https://api.allorigins.win/raw?url=",
  "https://thingproxy.freeboard.io/fetch/"
];
let proxyIndex = 0;

fetch('/proxies.json')
  .then(r => r.json())
  .then(list => { if (Array.isArray(list) && list.length) proxyList = list; })
  .catch(()=>{});

function getNextProxyUrl(targetUrl) {
  if (!proxyList.length) return null;
  const proxyUrl = proxyList[proxyIndex] + encodeURIComponent(targetUrl);
  proxyIndex = (proxyIndex + 1) % proxyList.length;
  return proxyUrl;
}

// 1. CORS Bypass Hints
async function fetchWithCORSBypass(url) {
  try {
    const resp = await fetch(url, { credentials: 'include' });
    if (!resp.ok) throw new Error('Network error');
    return await resp.blob();
  } catch (e) {
    if (e.message.includes('Failed to fetch')) {
      chrome.runtime.sendMessage({
        action: 'notify',
        message: 'CORS error: Try using a CORS proxy (e.g., https://corsproxy.io/?' + url + ') or run the extension in Electron/Node.js for unrestricted access.'
      });
    } else {
      chrome.runtime.sendMessage({ action: 'notify', message: `Fetch error: ${e.message}` });
    }
    throw e;
  }
}

// 2. Blob URL Fallback
function extractBlobURLData(blobUrl) {
  const script = document.createElement('script');
  script.textContent = `
    (async () => {
      try {
        const response = await fetch('${blobUrl}');
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onload = function() {
          window.postMessage({ type: 'BLOB_DATA', data: reader.result }, '*');
        };
        reader.readAsDataURL(blob);
      } catch (e) {
        window.postMessage({ type: 'BLOB_ERROR', error: e.message }, '*');
      }
    })();
  `;
  document.documentElement.appendChild(script);
  window.addEventListener('message', (event) => {
    if (event.data.type === 'BLOB_DATA') {
      chrome.runtime.sendMessage({ action: 'downloadBlob', dataUrl: event.data.data });
    }
    if (event.data.type === 'BLOB_ERROR') {
      chrome.runtime.sendMessage({ action: 'notify', message: 'Blob extraction failed: ' + event.data.error });
    }
  }, { once: true });
}

// 3. Dynamic Segment Assembly (HLS/DASH)
async function fetchSegmentsAndGuideMerge(playlistUrl, protocol = 'HLS') {
  try {
    const resp = await fetch(playlistUrl);
    const text = await resp.text();
    // For HLS: lines ending with .ts, for DASH: parse .mpd XML for <BaseURL>
    const segmentUrls = protocol === 'HLS'
      ? text.split('\n').filter(line => line.endsWith('.ts')).map(line => new URL(line, playlistUrl).href)
      : Array.from(text.matchAll(/<BaseURL>(.*?)<\/BaseURL>/g)).map(m => new URL(m[1], playlistUrl).href);

    // Download segments (user: implement download logic or relay to background/Electron)
    chrome.runtime.sendMessage({
      action: 'downloadSegments',
      segments: segmentUrls,
      protocol
    });

    // Notify user with ffmpeg command
    chrome.runtime.sendMessage({
      action: 'notify',
      message: `Downloaded ${segmentUrls.length} segments. Merge with:\nffmpeg -i "${playlistUrl}" -c copy output.mp4`
    });
  } catch (e) {
    chrome.runtime.sendMessage({ action: 'notify', message: 'Segment fetch failed: ' + e.message });
  }
}

// 4. Network Request Monitoring
function notifyManualNetworkInspection() {
  chrome.runtime.sendMessage({
    action: 'notify',
    message: `If automated extraction fails, open DevTools (F12), go to the Network tab, and filter for .mp4, .m3u8, .mpd, or segment files. Right-click and copy the URL for manual download or use with ffmpeg.`
  });
}

// --- Modular extraction functions for hard sites ---
async function extractRedditVideo() {
  try {
    // 1. Try <video> tags with v.redd.it
    const videos = document.querySelectorAll('video');
    let found = false;
    videos.forEach(video => {
      if (video.src && video.src.includes('v.redd.it')) {
        currentVideoURLs.push({ quality: 'unknown', url: video.src });
        found = true;
      } else if (video.querySelector('source')) {
        const source = video.querySelector('source');
        if (source && source.src && source.src.includes('v.redd.it')) {
          currentVideoURLs.push({ quality: 'unknown', url: source.src });
          found = true;
        }
      }
    });
    // 2. Try embedded JSON for DASH manifest
    if (!found) {
      const scripts = document.getElementsByTagName('script');
      for (let script of scripts) {
        if (script.textContent.includes('dashUrl')) {
          const match = script.textContent.match(/"dashUrl":"(https:[^"\\]+\.mpd)"/);
          if (match && match[1]) {
            const dashUrl = match[1].replace(/\\u0026/g, "&");
            // Try to fetch DASH manifest with session cookies if available
            let manifestText = null;
            if (window._redditSessionCookies) {
              // Build cookie header
              const cookieHeader = window._redditSessionCookies.map(c => `${c.name}=${c.value}`).join('; ');
              try {
                manifestText = await fetch(dashUrl, {
                  headers: { 'Cookie': cookieHeader }
                }).then(r => r.text());
              } catch (e) {
                console.warn('Failed authenticated fetch for DASH manifest:', e);
              }
            }
            // Fallback to normal fetch if no cookies or failed
            if (!manifestText) {
              // Try normal fetch, fallback to CORS bypass, then proxy fetch if needed
              try {
                manifestText = await fetch(dashUrl).then(r => r.text());
              } catch (e) {
                try {
                  const blob = await fetchWithCORSBypass(dashUrl);
                  manifestText = await blob.text();
                } catch (err) {
                  try {
                    // Proxy fetch via rotating proxies
                    let proxyUrl = getNextProxyUrl(dashUrl);
                    let lastErr;
                    for (let i = 0; i < proxyList.length; i++) {
                      try {
                        manifestText = await fetch(proxyUrl).then(r => r.text());
                        chrome.runtime.sendMessage({
                          action: 'notify',
                          message: `CORS bypassed using proxy: ${proxyUrl}`
                        });
                        break;
                      } catch (proxyErr) {
                        lastErr = proxyErr;
                        proxyUrl = getNextProxyUrl(dashUrl);
                      }
                    }
                    if (!manifestText) {
                      notifyManualNetworkInspection();
                      throw lastErr;
                    }
                  } catch (proxyErr) {
                    notifyManualNetworkInspection();
                    throw proxyErr;
                  }
                }
              }
            }
            // Parse DASH manifest for video/audio representations (qualities)
            let videoStreams = [];
            let audioStreams = [];
            if (manifestText) {
              // Find all <Representation> blocks for video/audio
              const repRegex = /<Representation[\s\S]*?<BaseURL>([^<]+)<\/BaseURL>[\s\S]*?<\/Representation>/g;
              let match;
              while ((match = repRegex.exec(manifestText)) !== null) {
                const repBlock = match[0];
                const url = repBlock.match(/<BaseURL>([^<]+)<\/BaseURL>/)?.[1];
                const bandwidth = repBlock.match(/bandwidth="(\d+)"/i)?.[1];
                const codecs = repBlock.match(/codecs="([^"]+)"/i)?.[1];
                if (url && codecs && codecs.includes('avc')) {
                  videoStreams.push({ url, bandwidth: Number(bandwidth) || 0 });
                } else if (url && codecs && codecs.includes('mp4a')) {
                  audioStreams.push({ url, bandwidth: Number(bandwidth) || 0 });
                }
              }
              // Sort by bandwidth (best quality first)
              videoStreams.sort((a, b) => b.bandwidth - a.bandwidth);
              audioStreams.sort((a, b) => b.bandwidth - a.bandwidth);
              // Push all found streams
              videoStreams.forEach((vs, i) => {
                currentVideoURLs.push({ quality: `DASH-video-${i+1}`, url: vs.url });
              });
              audioStreams.forEach((as, i) => {
                currentVideoURLs.push({ quality: `DASH-audio-${i+1}`, url: as.url });
              });
              // Notify user of all available streams
              let msg = 'Reddit DASH: Found video qualities: ' + videoStreams.map(v=>v.bandwidth).join(', ') + '\nFound audio qualities: ' + audioStreams.map(a=>a.bandwidth).join(', ');
              msg += '\nDownload the best (highest bandwidth) video and audio and merge with:\nffmpeg -i video.mp4 -i audio.mp4 -c copy output.mp4';
              msg += '\nFor advanced users: you can automate merging with ffmpeg scripting (see README).';
              chrome.runtime.sendMessage({
                action: 'notify',
                message: msg
              });
            } else {
              // If manifest not fetched, just push the manifest URL
              currentVideoURLs.push({ quality: 'DASH', url: dashUrl });
            }
            found = true;
            break;
          }
        }
      }
    }
    if (!found) {
      console.warn('Reddit: No video or DASH manifest found.');
    }
  } catch (e) {
    console.error('Reddit extraction error:', e);
  }
}

async function extractInstagramVideo() {
  try {
    // Look for video_url in scripts or <video> tags
    let found = false;
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      if (video.src) {
        currentVideoURLs.push({ quality: 'unknown', url: video.src });
        found = true;
      }
    });
    if (!found) {
      const scripts = document.getElementsByTagName('script');
      for (let script of scripts) {
        if (script.textContent.includes('video_url')) {
          const match = script.textContent.match(/\"video_url\":\"(https:[^\\\"]+\.mp4)\"/);
          if (match && match[1]) {
            currentVideoURLs.push({ quality: 'unknown', url: match[1].replace(/\\u0026/g, "&") });
            found = true;
            break;
          }
        }
      }
    }
    if (!found) {
      console.warn('Instagram: No video URLs found.');
    }
  } catch (e) {
    console.error('Instagram extraction error:', e);
  }
}

async function extractTikTokVideo() {
  try {
    // Look for videoData in scripts or <video> tags
    let found = false;
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      if (video.src) {
        currentVideoURLs.push({ quality: 'unknown', url: video.src });
        found = true;
      }
    });
    if (!found) {
      const scripts = document.getElementsByTagName('script');
      for (let script of scripts) {
        if (script.textContent.includes('videoData')) {
          const match = script.textContent.match(/\"contentUrl\":\"(https:[^\\\"]+\.mp4)\"/);
          if (match && match[1]) {
            currentVideoURLs.push({ quality: 'unknown', url: match[1].replace(/\\u0026/g, "&") });
            found = true;
            break;
          }
        }
      }
    }
    if (!found) {
      console.warn('TikTok: No video URLs found.');
    }
  } catch (e) {
    console.error('TikTok extraction error:', e);
  }
}

async function extractEmbeddedPlayerVideo() {
  try {
    // Attempt to extract direct <video> sources with known data attributes
    const video = document.querySelector('video[data-jwplayer], video[data-brightcove], video[data-kaltura], video[data-wistia], video[data-dacast]');
    if (video && video.src) {
      currentVideoURLs.push({ quality: 'unknown', url: video.src });
      return;
    }
    // Look for player config objects in scripts for embedded players
    const scripts = document.getElementsByTagName('script');
    for (let script of scripts) {
      // JWPlayer
      if (/jwplayer/i.test(script.textContent)) {
        // Try to extract JWPlayer config (look for file property)
        const match = script.textContent.match(/file\s*:\s*['\"](https?:[^'\"]+\.(mp4|m3u8))/i);
        if (match && match[1]) {
          currentVideoURLs.push({ quality: 'unknown', url: match[1] });
          return;
        }
      }
      // Brightcove
      if (/brightcove/i.test(script.textContent)) {
        // Look for Brightcove sources array
        const match = script.textContent.match(/sources\s*:\s*(\[[^\]]+\])/i);
        if (match) {
          try {
            const sources = JSON.parse(match[1].replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":'));
            for (const src of sources) {
              if (src.src) {
                currentVideoURLs.push({ quality: src.label || 'unknown', url: src.src });
              }
            }
            return;
          } catch (e) { /* JSON parse may fail on non-standard objects */ }
        }
      }
      // Kaltura
      if (/kaltura/i.test(script.textContent)) {
        // Look for kalturaPlayer.setup({ sources: [...] })
        const match = script.textContent.match(/sources\s*:\s*(\[[^\]]+\])/i);
        if (match) {
          try {
            const sources = JSON.parse(match[1].replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":'));
            for (const src of sources) {
              if (src.src) {
                currentVideoURLs.push({ quality: src.label || 'unknown', url: src.src });
              }
            }
            return;
          } catch (e) {}
        }
      }
      // Wistia
      if (/wistia/i.test(script.textContent)) {
        // Look for "assets": [{...}] with url property
        const match = script.textContent.match(/assets"\s*:\s*(\[[^\]]+\])/i);
        if (match) {
          try {
            const assets = JSON.parse(match[1].replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":'));
            for (const asset of assets) {
              if (asset.url) {
                currentVideoURLs.push({ quality: asset.display_name || 'unknown', url: asset.url });
              }
            }
            return;
          } catch (e) {}
        }
      }
      // Dacast (basic)
      if (/dacast/i.test(script.textContent)) {
        const match = script.textContent.match(/src\s*:\s*['\"](https?:[^'\"]+\.(mp4|m3u8))/i);
        if (match && match[1]) {
          currentVideoURLs.push({ quality: 'unknown', url: match[1] });
          return;
        }
      }
    }
    // If nothing found, log a warning
    console.warn('Embedded player config found but no direct video URL extracted. Manual inspection may be required.');
  } catch (e) {
    console.error('Embedded player extraction error:', e);
  }
}
// [2025-05-21] Enhanced extractEmbeddedPlayerVideo for JWPlayer, Brightcove, Kaltura, Wistia, Dacast. Added robust config parsing and comments for future expansion.


// --- Modular extraction functions for hard sites ---
async function extractTwitterVideo() {
  try {
    // Look for video URLs in <script> tags (basic approach)
    const scripts = document.getElementsByTagName('script');
    for (let script of scripts) {
      if (script.textContent.includes('video_url')) {
        const match = script.textContent.match(/\"video_url\":\"(https:[^\\\"]+\\.mp4)\"/);
        if (match && match[1]) {
          currentVideoURLs.push({ quality: 'unknown', url: match[1].replace(/\\u0026/g, "&") });
        }
      }
    }
    if (currentVideoURLs.length === 0) {
      console.warn('Twitter: No video URLs found in scripts.');
    }
  } catch (e) {
    console.error('Twitter extraction error:', e);
  }
}

async function extractFacebookVideo() {
  try {
    // Look for playable_url in <script> tags (basic approach)
    const scripts = document.getElementsByTagName('script');
    for (let script of scripts) {
      if (script.textContent.includes('playable_url')) {
        const match = script.textContent.match(/\"playable_url\":\"(https:[^\\\"]+\\.mp4)\"/);
        if (match && match[1]) {
          currentVideoURLs.push({ quality: 'unknown', url: match[1].replace(/\\u0025/g, "%").replace(/\\u0026/g, "&") });
        }
      }
    }
    if (currentVideoURLs.length === 0) {
      console.warn('Facebook: No video URLs found in scripts.');
    }
  } catch (e) {
    console.error('Facebook extraction error:', e);
  }
}
// --- End modular extraction functions ---

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

if (typeof window !== 'undefined' && typeof document !== 'undefined' && window.document) {
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('qualityForm');
    const button = form.querySelector('button');
    const spinner = button.querySelector('.spinner');

    // Load saved quality preference
    chrome.storage.sync.get(['preferredQuality'], (result) => {
        const preferredQuality = result.preferredQuality || '720p';
        document.querySelector(`input[name="quality"][value="${preferredQuality}"]`).checked = true;
    });

    // Save selected quality on form submit
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        button.disabled = true;
        spinner.style.display = 'inline-block';
        const selectedRadio = document.querySelector('input[name="quality"]:checked');
if (!selectedRadio) {
    alert('Please select a quality option.');
    button.disabled = false;
    spinner.style.display = 'none';
    return;
}
const selectedQuality = selectedRadio.value;
        chrome.storage.sync.set({ preferredQuality: selectedQuality }, () => {
            setTimeout(() => {
                alert(`Preferred quality set to ${selectedQuality}`);
                button.disabled = false;
                spinner.style.display = 'none';
                window.close();
            }, 500);
        });
    });
  });
}