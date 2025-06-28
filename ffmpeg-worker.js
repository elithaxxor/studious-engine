// ffmpeg-worker.js
// Placeholder worker notifying that ffmpeg.wasm is not yet integrated.
self.onmessage = () => {
  postMessage({ type: 'error', message: 'ffmpeg integration not yet implemented' });
};
