
import { rimraf } from 'rimraf'
import { download } from 'electron-dl';

const fs = require('fs');
const path = require('path');
const tar = require('tar');
const bzip2 = require('unbzip2-stream');
const { ipcMain ,dialog} = require('electron');

export function setupASRModelManager(win) {
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
