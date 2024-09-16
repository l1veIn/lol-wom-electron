import { rimraf } from 'rimraf'
import { download } from 'electron-dl';
import logger from '../utils/logger';

const fs = require('fs');
const path = require('path');
const tar = require('tar');
const bzip2 = require('unbzip2-stream');
const { ipcMain, dialog } = require('electron');

export function setupASRModelManager(win) {
    logger.info('开始设置 ASR 模型管理器');

    ipcMain.handle('select-directory', async () => {
        logger.debug('收到选择目录请求');
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory']
        });
        logger.info('用户选择的目录', { path: result.filePaths[0] });
        return result.filePaths[0];
    });

    ipcMain.handle('check-model-existence', (event, { modelDir, modelName }) => {
        logger.debug('检查模型是否存在', { modelDir, modelName });
        const dirExists = fs.existsSync(path.join(modelDir, modelName));
        const tarExists = fs.existsSync(path.join(modelDir, modelName + '.tar.bz2'));
        logger.info('模型存在性检查结果', { dirExists, tarExists });
        return { dir: dirExists, tar: tarExists };
    });

    ipcMain.handle('start-download', async (event, { url, destination, modelName, modelDir }) => {
        logger.info('开始下载模型', { url, destination, modelName });
        try {
            await download(win, url, {
                directory: path.dirname(destination),
                filename: path.basename(destination),
                onProgress: (progress) => {
                    logger.debug('下载进度', { progress: progress.percent, modelName });
                    win.webContents.send('download-progress', { progress: progress.percent, modelName });
                }
            });
            logger.info('模型下载完成', { modelName });
            win.webContents.send('download-complete', { success: true, modelName });
            return true;
        } catch (error) {
            logger.error('模型下载失败', { error, modelName });
            win.webContents.send('download-complete', { success: false, modelName });
            throw error;
        }
    });

    ipcMain.handle('extract-model', async (event, { source, destination }) => {
        logger.info('开始解压模型', { source, destination });
        return new Promise((resolve, reject) => {
            fs.createReadStream(source)
                .pipe(bzip2())
                .pipe(tar.extract({ cwd: destination }))
                .on('finish', () => fs.unlink(source, (error) => {
                    if (error) {
                        logger.error('模型文件删除失败', { error, source });
                        reject(error);
                    } else {
                        logger.info('模型解压完成并删除源文件', { source, destination });
                        resolve(true);
                    }
                }))
                .on('error', (error) => {
                    logger.error('模型解压失败', { error, source, destination });
                    reject(error);
                });
        });
    });

    ipcMain.handle('delete-file', (event, filePath) => {
        logger.debug('请求删除文件', { filePath });
        return new Promise((resolve, reject) => {
            fs.unlink(filePath, (error) => {
                if (error) {
                    logger.error('文件删除失败', { error, filePath });
                    reject(error);
                } else {
                    logger.info('文件删除成功', { filePath });
                    resolve(true);
                }
            });
        });
    });

    ipcMain.handle('delete-directory', (event, directoryPath) => {
        logger.debug('请求删除目录', { directoryPath });
        return rimraf(directoryPath)
            .then(() => {
                logger.info('目录删除成功', { directoryPath });
                return true;
            })
            .catch((error) => {
                logger.error('目录删除失败', { error, directoryPath });
                throw error;
            });
    });

    logger.info('ASR 模型管理器设置完成');
}
