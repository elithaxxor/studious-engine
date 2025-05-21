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
          currentVideoURLs.push({ quality: 'unknown', url: video.src });
        } else if (video.querySelector('source')) {
          const source = video.querySelector('source');
          if (source && source.src) {
            currentVideoURLs.push({ quality: 'unknown', url: source.src });
          }
        }
      });
      if (currentVideoURLs.length === 0) {
        console.warn('No <video> sources found on page.');
      }
    } catch (e) { console.error('Generic <video> extraction error:', e); }
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
              manifestText = await fetch(dashUrl).then(r => r.text());
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
    // Look for data attributes or player configs
    const video = document.querySelector('video[data-jwplayer], video[data-brightcove], video[data-kaltura], video[data-wistia]');
    if (video && video.src) {
      currentVideoURLs.push({ quality: 'unknown', url: video.src });
    } else {
      // Advanced: Look for player config objects in scripts
      const scripts = document.getElementsByTagName('script');
      for (let script of scripts) {
        if (script.textContent.match(/jwplayer|brightcove|kaltura|wistia/i)) {
          // This is a stub: add custom parsing for each player as needed
          console.warn('Embedded player config found. Add custom extraction logic here.');
        }
      }
    }
  } catch (e) {
    console.error('Embedded player extraction error:', e);
  }
}

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
        const selectedQuality = document.querySelector('input[name="quality"]:checked').value;
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