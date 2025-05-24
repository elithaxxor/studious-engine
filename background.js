/* background.js
Listens for messages to download video segments and optionally merge them.
Provides notifications to guide the user.
*/

// FFmpeg WASM setup for optional merging
let ffmpegInstance = null;
async function mergeSegmentsWithFFmpeg(segments, outputName, protocol) {
    if (!ffmpegInstance) {
        importScripts('ffmpeg.min.js'); // from ffmpeg.wasm
        ffmpegInstance = FFmpeg.createFFmpeg({ log: true });
        await ffmpegInstance.load();
    }
    for (let i = 0; i < segments.length; i++) {
        const res = await fetch(segments[i]);
        ffmpegInstance.FS('writeFile', `part${i}.${protocol === 'HLS' ? 'ts' : 'm4s'}`, new Uint8Array(await res.arrayBuffer()));
    }
    const concatList = segments.map((_, i) => `file part${i}.${protocol === 'HLS' ? 'ts' : 'm4s'}`).join('\n');
    ffmpegInstance.FS('writeFile', 'list.txt', concatList);
    await ffmpegInstance.run('-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', outputName);
    const data = ffmpegInstance.FS('readFile', outputName);
    const blob = new Blob([data.buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({ url, filename: outputName, saveAs: true });
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'downloadSegments') {
        chrome.storage.sync.get(['saveLocations', 'autoMerge'], (prefs) => {
            const site = message.site || 'generic';
            const quality = message.quality || 'unknown';
            const folder = (prefs.saveLocations?.[site]?.[quality]) || (prefs.saveLocations?.[site]?._default) || '';
            message.segments.forEach((segment, index) => {
                const filename = `${folder ? folder + '/' : ''}video_segment_${index}.${message.protocol === 'HLS' ? 'ts' : 'm4s'}`;
                chrome.downloads.download({ url: segment, filename, saveAs: false });
            });
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon.png',
                title: 'Video Downloader',
                message: `Downloading ${message.protocol} segments. ${prefs.autoMerge ? 'Merging when done...' : 'Merge with ffmpeg after download.'}`
            });
            if (prefs.autoMerge) {
                mergeSegmentsWithFFmpeg(message.segments, 'merged_output.mp4', message.protocol);
            }
        });
    }
    if (message.action === 'notify' && message.message) {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon.png',
            title: 'Video Downloader',
            message: message.message
        });
    }
    if (message.action === 'setSaveLocation') {
        chrome.storage.sync.get({ saveLocations: {} }, (data) => {
            if (!data.saveLocations[message.site]) data.saveLocations[message.site] = {};
            data.saveLocations[message.site][message.quality || '_default'] = message.path;
            chrome.storage.sync.set({ saveLocations: data.saveLocations });
        });
    }
    if (message.action === 'setAutoMerge') {
        chrome.storage.sync.set({ autoMerge: message.value });
    }
    // ... existing handlers ...
});
