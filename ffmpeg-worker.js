// ffmpeg-worker.js
// Placeholder for ffmpeg.wasm integration.
// This worker will receive an array of segment URLs, fetch them, and run ffmpeg
// in the browser to merge into a single MP4. Actual implementation pending.
self.onmessage = () => {
  postMessage({ type: 'error', message: 'ffmpeg integration not yet implemented' });
};

