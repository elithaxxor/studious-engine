/* main.js
Electron main process: creates a window, listens for download_video events, and downloads videos via HTTPS.
Handles file save dialog and download completion/error.
No obvious errors in the shown code.*/ 




const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const https = require('https');
const fs = require('fs');
const path = require('path');

let mainWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      
      // ENTER CONTEXT HERE FOR PRELOAD 
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  mainWindow.loadFile('index.html');
});

ipcMain.on('download_video', async (event, url) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'video.mp4',
    filters: [{ name: 'Videos', extensions: ['mp4', 'webm', 'ogg'] }],
  });
  if (!result.canceled && result.filePath) {
    const file = fs.createWriteStream(result.filePath);
    https.get(url, (response) => {
      const contentType = response.headers['content-type'];
      let extension = '.mp4';
      if (contentType && contentType.includes('video/webm')) extension = '.webm';
      else if (contentType && contentType.includes('video/ogg')) extension = '.ogg';
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        mainWindow.webContents.send('download_complete', 'Download completed');
      });
    }).on('error', (err) => {
      fs.unlink(result.filePath, () => {});
      mainWindow.webContents.send('download_error', err.message);
    });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Automated segment merging (Electron only)
const { spawn } = require('child_process');
ipcMain.on('download_segments_and_merge', async (event, { segments, output, protocol }) => {
  try {
    // Save segments to temp files
    const tempDir = fs.mkdtempSync(path.join(app.getPath('temp'), 'segments-'));
    const segmentFiles = [];
    for (let i = 0; i < segments.length; i++) {
      const segUrl = segments[i];
      const segPath = path.join(tempDir, `seg${i}.${protocol === 'HLS' ? 'ts' : 'm4s'}`);
      const file = fs.createWriteStream(segPath);
      await new Promise((resolve, reject) => {
        https.get(segUrl, (response) => {
          response.pipe(file);
          file.on('finish', () => { file.close(resolve); });
        }).on('error', reject);
      });
      segmentFiles.push(segPath);
    }
    // Create ffmpeg concat list file
    const listPath = path.join(tempDir, 'segments.txt');
    fs.writeFileSync(listPath, segmentFiles.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
    // Prompt user for save location
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: output || `merged.${protocol === 'HLS' ? 'mp4' : 'mp4'}`,
      filters: [{ name: 'Videos', extensions: ['mp4', 'webm', 'ogg'] }],
    });
    if (result.canceled || !result.filePath) throw new Error('User canceled');
    // Run ffmpeg to merge
    const ffmpegArgs = [
      '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', result.filePath
    ];
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    let stderr = '';
    ffmpeg.stderr.on('data', data => { stderr += data.toString(); });
    ffmpeg.on('close', code => {
      if (code === 0) {
        mainWindow.webContents.send('merge_complete', result.filePath);
      } else {
        mainWindow.webContents.send('merge_error', stderr || 'ffmpeg failed');
      }
      // Clean up temp files
      segmentFiles.forEach(f => fs.unlinkSync(f));
      fs.unlinkSync(listPath);
      fs.rmdirSync(tempDir);
    });
  } catch (err) {
    mainWindow.webContents.send('merge_error', err.message);
  }
});

