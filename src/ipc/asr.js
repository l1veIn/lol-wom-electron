
import ChildProcessManager from '../utils/child_process_manager.js';
const { ipcMain, clipboard, BrowserWindow, screen } = require('electron');
const { fork } = require('child_process');
import { join } from 'path'
const path = require('path');
const portAudio = require('naudiodon2');
import icon from '../../resources/icon.png?asset'

export function setupASR(win) {
  let asrProcess = new ChildProcessManager(path.join(__dirname, '../../child_process/asr_process/asr_process.js'))
  let lyricsWindow
  ipcMain.handle('start-asr', (_, data) => {
    if (!asrProcess.exist()) {
      asrProcess.start()
      asrProcess.on('message', (message) => {
        clipboard.writeText(message);
        win.webContents.send('asr-message', message);
        if (lyricsWindow) {
          lyricsWindow.webContents.send('asr-message', message);
        }
      });
      asrProcess.on('exit', () => {
        asrProcess.stop();
        console.log('asr process exit');
      });
      asrProcess.send(data);
    } else {
      return false;
    }
  });
  ipcMain.handle('stop-asr', () => {
    if (asrProcess) {
      asrProcess.send('stop-asr');
    }
  });
  ipcMain.handle('get-asr-status', () => {
    return asrProcess.exist()
  });
  ipcMain.handle('get-asr-devices', () => {
    return portAudio.getDevices();
  });
  ipcMain.handle('open-lyric-window', () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    lyricsWindow = new BrowserWindow({
      width: 500,
      height: 100,
      x: width - 520, // 20px margin from right
      y: height - 120, // 20px margin from bottom
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      icon,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        nodeIntegration: true,
        contextIsolation: false
      }
    }) 
    lyricsWindow.setIgnoreMouseEvents(false);
    lyricsWindow.setBackgroundColor("rgba(0, 0, 0, 0)")
    lyricsWindow.loadURL("http://localhost:8080/#/pages/lyricsWindow/lyricsWindow")
    // lyricsWindow.setOpacity(0.1)
   

    // lyricsWindow.setIgnoreMouseEvents(true, { forward: true });

  });
  ipcMain.handle('close-lyric-window', () => {
    if(lyricsWindow){
      lyricsWindow.close()
    }
  });
  ipcMain.handle('fix-position', (event, fixed) => {
    // lyricsWindow.setMovable(!fixed);
    // lyricsWindow.setIgnoreMouseEvents(fixed, { forward: true });
  });

  ipcMain.handle('set-ignore-mouse-events', (event, ignore, options) => {
    lyricsWindow.setIgnoreMouseEvents(ignore, options);
  });
}