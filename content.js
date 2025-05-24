// Add to existing content.js (extractVideoURLs)
let currentVideoURLs = [];
let streamingInfo = null;

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
              if (stream.mimeType && stream.mimeType.includes('video/mp4') && stream.url) {
                currentVideoURLs.push({
                  quality: stream.qualityLabel,
                  url: stream.url
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
                          if (source.type === 'video/mp4' && source.url) {
                              currentVideoURLs.push({
                                  quality: quality + 'p',
                                  url: source.url
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
            }
          });
        } else {
          const urlMatches = script.textContent.match(/https?:[^"']+\.(?:mp4|m3u8)[^"']*/g);
          if (urlMatches) {
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
