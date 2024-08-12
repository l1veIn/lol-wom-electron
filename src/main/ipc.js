import { ipcMain, dialog } from 'electron';
import { init_lcu, getCurrentSummoner, get, post, getClientUrl } from '../lcu/client';
const { fork } = require('child_process');
import { download } from 'electron-dl';
import { rimraf } from 'rimraf'
const { clipboard } = require('electron');

const fs = require('fs');
const path = require('path');
const tar = require('tar');
const bzip2 = require('unbzip2-stream');

let asrProcess = null;
function test(_,data) {
  console.log('test',data);
}
export function setupIPC(win) {
  ipcMain.handle('test', test);
  ipcMain.handle('init_lcu', () => init_lcu(win));
  ipcMain.handle('current-summoner', getCurrentSummoner);
  ipcMain.handle('get-client-url', getClientUrl);
  ipcMain.handle('get-url', get);
  ipcMain.handle('post-url', post)
  ipcMain.handle('start-asr', (_,data) => {
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
      // asrProcess.send('start-asr');
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


  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    return result.filePaths[0];
  });

  ipcMain.handle('check-model-existence', (event, { modelDir, modelName }) => {
    return { dir: fs.existsSync(path.join(modelDir, modelName)), tar: fs.existsSync(path.join(modelDir, modelName + '.tar.bz2')) };
  });

  ipcMain.handle('start-download', async (event, { url, destination, modelName, modelDir }) => {
    try {
      await download(win, url, {
        directory: path.dirname(destination),
        filename: path.basename(destination),
        onProgress: (progress) => {
          win.webContents.send('download-progress', { progress: progress.percent, modelName });
        }
      });
      win.webContents.send('download-complete', { success: true, modelName });
      // fs.createReadStream(source)
      //   .pipe(bzip2())
      //   .pipe(tar.extract({ cwd: destination }))
      //   .on('finish', () => {fs.unlink(filePath, (error) => {});})
      //   .on('error', (error) => {
      //     console.error('Extraction failed:', error);
      //   });
      return true;
    } catch (error) {
      console.error('Download failed:', error);
      win.webContents.send('download-complete', { success: false, modelName });
      throw error;
    }
  });

  ipcMain.handle('extract-model', async (event, { source, destination }) => {
    return new Promise((resolve, reject) => {
      fs.createReadStream(source)
        .pipe(bzip2())
        .pipe(tar.extract({ cwd: destination }))
        .on('finish', () => fs.unlink(source, (error) => {
          if (error) {
            console.error('File deletion failed:', error);
            reject(error);
          } else {
            resolve(true);
          }
        }))
        .on('error', (error) => {
          console.error('Extraction failed:', error);
          reject(error);
        });
    });
  });

  ipcMain.handle('delete-file', (event, filePath) => {
    return new Promise((resolve, reject) => {
      fs.unlink(filePath, (error) => {
        if (error) {
          console.error('File deletion failed:', error);
          reject(error);
        } else {
          resolve(true);
        }
      });
    });
  });
  ipcMain.handle('delete-directory', (event, directoryPath) => {
    return rimraf(directoryPath)
  });


}