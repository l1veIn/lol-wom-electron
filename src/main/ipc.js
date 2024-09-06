import { ipcMain, dialog, shell, BrowserWindow, app } from 'electron';
import icon from '../../resources/icon.png?asset'

import { init_lcu, getCurrentSummoner, get, post, getClientUrl } from '../lcu/client';
import ChildProcessManager from '../utils/child_process_manager.js';

import { setupASR } from '../ipc/asr';
import { setupASRModelManager } from '../ipc/asr_model_manager';
import { setupShortcut } from '../ipc/shortcut';
const path = require('path');

let sender = new ChildProcessManager(path.join(__dirname, '../../child_process/sender/sender.js'))
sender.start()
async function test(_, data) {
  console.log('test', data);
}
export function setupIPC(win, store) {
  ipcMain.handle('test', test);
  ipcMain.handle('reboot', () => {
    app.quit()
  })
  ipcMain.handle('move_to_front', () => {
    win.setAlwaysOnTop(true)
    win.moveTop();
    win.show()
    win.focus();
    win.setAlwaysOnTop(false)
  })
  ipcMain.handle('send-msg-to-game', (event, message) => {
    sender.send({ sendClipboard2Game: true, data: message })
  })
  ipcMain.handle('init_lcu', () => init_lcu(win));
  ipcMain.handle('current-summoner', getCurrentSummoner);
  ipcMain.handle('get-client-url', getClientUrl);
  ipcMain.handle('get-url', get);
  ipcMain.handle('post-url', post)
  ipcMain.handle('open-url', (event, url) => shell.openExternal(url))
  ipcMain.handle('open-url-in-window', (event, tool) => {
    const newWindow = new BrowserWindow({
      width: tool.width,
      height: tool.height,
      maximizable: false,
      autoHideMenuBar: true,
      titleBarOverlay: {
        color: 'rgba(0,0,0,0)',
        height: 35,
        symbolColor: 'white'
      },
      movable: true,
      icon,
      webPreferences: {
        sandbox: false
      }
    });
    newWindow.loadURL(tool.url);
  });
  setupASR(win)
  setupASRModelManager(win)
  setupShortcut(win, sender)
}