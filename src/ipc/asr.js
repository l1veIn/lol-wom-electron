
import ChildProcessManager from '../utils/child_process_manager.js';
const { ipcMain,clipboard } = require('electron');
const { fork } = require('child_process');
const path = require('path');

export function setupASR(win) {
    let asrProcess = new ChildProcessManager(path.join(__dirname, '../../child_process/asr_process/asr_process.js'))
    ipcMain.handle('start-asr', (_, data) => {
      if (!asrProcess.exist()) {
        // asrProcess = fork(path.join(__dirname, '../../child_process/asr_process/asr_process.js'));
        // let shortcutProcess = new ChildProcessManager(path.join(__dirname, '../../child_process/nut/handle_nut.js'))
        asrProcess.start()
        asrProcess.on('message', (message) => {
          clipboard.writeText(message);
          win.webContents.send('asr-message', message);
        });
        asrProcess.on('exit', () => {
          asrProcess.kill();
          console.log('asr process exit');
          asrProcess = null;
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
      return asrProcess == null ? false : true;
    });
  
  
}