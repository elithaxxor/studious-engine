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
      if (contentType.includes('video/webm')) extension = '.webm';
      else if (contentType.includes('video/ogg')) extension = '.ogg';
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
