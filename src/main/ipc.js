import { ipcMain } from 'electron';
import { join } from 'path'
import { init_lcu, getCurrentSummoner, get, post, getClientUrl } from '../lcu/client';
import { setupASR, stopASR } from '../utils/ASR';

let asrRuning = false;

function test() {
  console.log('test');
}
export function setupIPC(win) {
  ipcMain.handle('test', test);
  ipcMain.handle('init_lcu', () => init_lcu(win));
  ipcMain.handle('current-summoner', getCurrentSummoner);
  ipcMain.handle('get-client-url', getClientUrl);
  ipcMain.handle('get-url', get);
  ipcMain.handle('post-url', post)
  ipcMain.handle('start-asr', () => {
    if (!asrRuning) {
      setupASR(win);
      asrRuning = true;
      return true;
    } else {
      return false;
    }
  });
  ipcMain.handle('stop-asr', () => {
    if (asrRuning) {
      stopASR();
      asrRuning = false;
      return true;
    } else {
      return false;
    }
  });
  ipcMain.handle('get-asr-status', () => {
    return asrRuning;
  });
}