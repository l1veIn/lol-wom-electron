const { ipcMain,clipboard } = require('electron');
const { fork } = require('child_process');
const path = require('path');

export function setupASR(win) {
    let asrProcess = null;
    ipcMain.handle('start-asr', (_, data) => {
      if (!asrProcess) {
        asrProcess = fork(path.join(__dirname, '../../child_process/asr_process/asr_process.js'));
  
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