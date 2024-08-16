
import ChildProcessManager from '../utils/child_process_manager.js';
import { is} from '@electron-toolkit/utils'
const { ipcMain, clipboard, BrowserWindow, screen } = require('electron');
const { fork } = require('child_process');
import { join } from 'path'
const path = require('path');
const portAudio = require('naudiodon2');
import icon from '../../resources/icon.png?asset'

export function setupASR(win) {
  let lyricsWindow
  let asrProcess = new ChildProcessManager(path.join(__dirname, '../../child_process/asr_process/asr_process.js'))
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
  ipcMain.handle('start-asr', (_, data) => {
    if (!asrProcess.exist()) {
      asrProcess.start()
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
    if(!lyricsWindow){
      lyricsWindow = new BrowserWindow({
        width: 500,
        height: 100,
        x: width - 520, // 20px margin from right
        y: height - 120, // 20px margin from bottom
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        icon,
        show: false,
        webPreferences: {
          preload: join(__dirname, '../preload/index.js'),
          nodeIntegration: true,
          contextIsolation: false
        }
      }) 
      lyricsWindow.setIgnoreMouseEvents(false);
      lyricsWindow.setBackgroundColor("rgba(0, 0, 0, 0)")
      if (is.dev) {
        lyricsWindow.loadURL('http://localhost:5173/')
      } else {
        lyricsWindow.loadFile(join(__dirname, '../renderer/index.html'))
      }
      lyricsWindow.on('ready-to-show', () => {
        lyricsWindow.show()
      })
      lyricsWindow.on('closed', () => {
        lyricsWindow = null
      })
    }else{
      lyricsWindow.show()
    }
  });
  ipcMain.handle('close-lyric-window', () => {
    if(lyricsWindow){
      try {
        lyricsWindow.hide()
      } catch (error) {
        console.log(error)
      }
    }
  });
  ipcMain.handle('set-ignore-mouse-events', (event, ignore, options) => {
    lyricsWindow.setIgnoreMouseEvents(ignore, options);
  });
}