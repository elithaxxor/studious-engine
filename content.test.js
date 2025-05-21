// content.test.js
// Unit tests for Reddit DASH manifest extraction and best quality detection

// Simple mock for DOM and fetch
const { JSDOM } = require('jsdom');

// Import or require the extraction function(s)
const fs = require('fs');
const path = require('path');

// We'll assume extractRedditVideo is exported for testing
const { extractRedditVideo } = require('./content');

describe('Reddit DASH Extraction', () => {
  let window, document;

  beforeEach(() => {
    // Set up a basic DOM
    const dom = new JSDOM(`<!DOCTYPE html><body></body>`);
    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
    global.chrome = { runtime: { sendMessage: jest.fn() } };
    global.currentVideoURLs = [];
  });

  it('should extract all video/audio representations from a DASH manifest', async () => {
    // Simulate a DASH manifest as a string
    const manifest = fs.readFileSync(path.join(__dirname, 'sample.mpd'), 'utf8');
    // Mock fetch to return the manifest
    global.fetch = jest.fn().mockResolvedValue({ text: () => Promise.resolve(manifest) });
    // Insert a <script> tag with dashUrl
    const script = document.createElement('script');
    script.textContent = '{"someKey":123,"dashUrl":"https://v.redd.it/fake/sample.mpd","otherKey":456}';
    if (!document.head) {
  const head = document.createElement('head');
  document.documentElement.insertBefore(head, document.body);
}
document.head.appendChild(script);
// Debug: log all script textContents
console.log([...document.getElementsByTagName('script')].map(s => s.textContent));
    // Call extraction
    await extractRedditVideo();
    // Check that multiple video/audio URLs were found
    expect(global.currentVideoURLs.some(v => v.quality.startsWith('DASH-video'))).toBe(true);
    expect(global.currentVideoURLs.some(v => v.quality.startsWith('DASH-audio'))).toBe(true);
    // Check that best quality (highest bandwidth) is first
    const videoQualities = global.currentVideoURLs.filter(v => v.quality.startsWith('DASH-video'));
    expect(videoQualities[0].url).toMatch(/video_high/);
  });

  // Add more tests for edge cases, authentication, etc.
});
