// ffmpeg-worker.js
// Web worker wrapper for ffmpeg.wasm
importScripts('https://unpkg.com/@ffmpeg/ffmpeg@0.11.8/dist/ffmpeg.min.js');
const { createFFmpeg } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });

self.onmessage = async ({ data }) => {
  if (data.action === 'merge' && data.files) {
    if (!ffmpeg.isLoaded()) await ffmpeg.load();
    for (const [name, content] of Object.entries(data.files)) {
      ffmpeg.FS('writeFile', name, content);
    }
    await ffmpeg.run('-i', 'input.m3u8', '-c', 'copy', 'output.mp4');
    const out = ffmpeg.FS('readFile', 'output.mp4');
    self.postMessage({ action: 'merged', file: out.buffer });
  }
};

