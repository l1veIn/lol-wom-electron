const { ipcMain, clipboard, BrowserWindow, screen, desktopCapturer } = require('electron');
const { spawn } = require('child_process');
import { join } from 'path'
const path = require('path');
import icon from '../../resources/icon.png?asset'
import logger from '../utils/logger';
const sharp = require('sharp');
import { app } from 'electron';
import fs from 'fs/promises';
const { Worker } = require('worker_threads');

async function removeBlackOverlayAndWhiteText(inputPath, outputPath) {
    try {
        const image = sharp(inputPath);
        const { data, info } = await image
            .raw()
            .toBuffer({ resolveWithObject: true });

        const outputBuffer = Buffer.alloc(data.length);

        for (let i = 0; i < data.length; i += info.channels) {
            let isTextArea = true;
            for (let c = 0; c < 3; c++) {
                if (Math.abs(data[i + c] - 108) > 10) {
                    isTextArea = false;
                    break;
                }
            }
            for (let c = 0; c < 3; c++) {
                let pixelValue = data[i + c];

                if (isTextArea) {
                    // 文字区域：去除rgba(108, 108, 108, 0.94)遮罩
                    pixelValue = (pixelValue - 0.94 * 108) / 0.06;
                } else {
                    // 背景区域：去除rgba(0, 0, 0, 0.9)遮罩
                    pixelValue = (pixelValue - 0.9 * 0) / 0.1;
                }

                pixelValue = Math.max(0, Math.min(255, pixelValue));
                outputBuffer[i + c] = Math.round(pixelValue);
            }
            // 保持alpha通道不变
            if (info.channels === 4) {
                outputBuffer[i + 3] = data[i + 3];
            }
        }
        await sharp(outputBuffer, {
            raw: {
                width: info.width,
                height: info.height,
                channels: info.channels
            }
        })
            .toFile(outputPath);

        console.log('图像处理完成');
    } catch (error) {
        console.error('处理图像时发生错误:', error);
    }
}
export function setupOCR(win) {
    logger.info('开始设置 OCR');
    let ocrWindow;
    let lastImage;
    let worker;
    let intervalId;
    let ocrEngine;
    let monitorRegion = { x: 0, y: 0, width: 400, height: 300 };
    let loading = false;
    function stopScreenMonitoring() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        if (lastImage) {
            lastImage = null;
        }
    }
    async function startScreenMonitoring() {
        stopScreenMonitoring()
        const MONITOR_INTERVAL = 1000; // 每秒检查一次
        const CHANGE_THRESHOLD = 0.1; // 10%的像素变化被认为是明显变化
        intervalId = setInterval(async () => {
            try {
                // 自动获取当前屏幕分辨率
                const screenSize = screen.getPrimaryDisplay().size;
                const sources = await desktopCapturer.getSources({
                    types: ['screen'],
                    thumbnailSize: screenSize
                });
                const primaryDisplay = sources[0];
                const screenView = { x: 0, y: 0, width: screenSize.width, height: screenSize.height }
                if (primaryDisplay) {
                    const fullImage = primaryDisplay.thumbnail;
                    // 求monitorRegion和screenView的交集
                    let intersection = {
                        x: Math.max(monitorRegion.x, screenView.x),
                        y: Math.max(monitorRegion.y, screenView.y),
                        width: Math.min(monitorRegion.x + monitorRegion.width, screenView.x + screenView.width) - Math.max(monitorRegion.x, screenView.x),
                        height: Math.min(monitorRegion.y + monitorRegion.height, screenView.y + screenView.height) - Math.max(monitorRegion.y, screenView.y)
                    };
                    const croppedImage = await sharp(fullImage.toPNG())
                        .extract({
                            left: intersection.x,
                            top: intersection.y,
                            width: intersection.width,
                            height: intersection.height
                        })
                        .toBuffer();

                    if (lastImage) {
                        worker.postMessage({
                            oldImage: lastImage,
                            newImage: croppedImage,
                            threshold: CHANGE_THRESHOLD
                        });
                        worker.once('message', async (hasChanged) => {
                            if (hasChanged) {
                                if (!loading) {
                                    loading = true;
                                } else {
                                    console.log('hasChanged')
                                    ocrWindow.webContents.send('ocr-window-status', 'loading');
                                    let date = Date.now()
                                    const screenshotPath = path.join(app.getPath('pictures'), `screenshot.png`);
                                    const screenshotPathRemoveBlack = path.join(app.getPath('pictures'), `screenshot_remove_black.png`);
                                    await sharp(croppedImage).toFile(screenshotPath);
                                    console.log(`检测到变化,截图已保存: ${screenshotPath}`);
                                    await removeBlackOverlayAndWhiteText(screenshotPath, screenshotPathRemoveBlack);
                                    // 直接将 croppedImage 转换为 base64
                                    // const base64Image = croppedImage.toString('base64');
                                    ocrEngine.stdin.write(JSON.stringify({ image_path: screenshotPathRemoveBlack }) + '\n');
                                    // ocrEngine.stdin.write(JSON.stringify({ image_base64: base64Image }) + '\n');
                                    loading = false;
                                }
                            }
                        });
                    } else {
                        let date = Date.now()
                        const screenshotPath = path.join(app.getPath('pictures'), `screenshot.png`);
                        const screenshotPathRemoveBlack = path.join(app.getPath('pictures'), `screenshot_remove_black.png`);
                        await sharp(croppedImage).toFile(screenshotPath);
                        console.log(`检测到变化,截图已保存: ${screenshotPath}`);
                        await removeBlackOverlayAndWhiteText(screenshotPath, screenshotPathRemoveBlack);
                        // const base64Image = croppedImage.toString('base64');
                        ocrEngine.stdin.write(JSON.stringify({ image_path: screenshotPathRemoveBlack }) + '\n');
                        // ocrEngine.stdin.write(JSON.stringify({ image_base64: base64Image }) + '\n');
                    }

                    lastImage = croppedImage;
                }
            } catch (error) {
                logger.error('屏幕监控失败:', error);
            }

        }, MONITOR_INTERVAL);
    }
    ipcMain.handle('start-ocr', async (_, data) => {
        logger.info('收到启动 OCR 请求', { data });
        ocrWindow = new BrowserWindow({
            frame: false,
            transparent: true,
            icon,
            show: false,
            webPreferences: {
                preload: join(__dirname, '../preload/index.js'),
                nodeIntegration: true,
                contextIsolation: false,
            },
        });
        worker = new Worker(path.join(__dirname, '../../child_process/ocr/imageWorker.js'));
        let ocrEnginePath = path.join(__dirname, '../../child_process/ocr/ocr_engine');
        ocrEngine = spawn(path.join(ocrEnginePath, './RapidOCR-json.exe'), ['--models=' + path.join(ocrEnginePath, './models')]);
        ocrEngine.stdout.on('data', (data) => {
            const result = data.toString().trim();
            console.log(`OCR引擎输出: ${result}`);
            ocrWindow.webContents.send('ocr-result', result);
        });
        ocrEngine.stderr.on('data', (data) => {
            console.error(`OCR引擎错误: ${data}`);
            ocrWindow.webContents.send('ocr-error', data.toString());
        });
        ocrEngine.on('close', (code) => {
            console.log(`OCR引擎进程退出,退出码 ${code}`);
        });
        ocrWindow.setMinimumSize(100, 100)
        ocrWindow.setAlwaysOnTop(true, 'screen-saver')
        ocrWindow.loadURL('http://localhost:5173/ocr');

        function updateWindowInfo() {
            if (!ocrWindow) return;
            ocrWindow.webContents.send('ocr-window-status', 'loading');
            const bounds = ocrWindow.getBounds();
            monitorRegion = { ...bounds };
            ocrWindow.webContents.send('ocr-window-info', bounds);
            logger.info('OCR窗口信息已更新', { monitorRegion });
            startScreenMonitoring().catch(err => console.error('启动屏幕监控失败:', err));;
        }
        //ocrWindow 设置窗口的大小和位置
        ocrWindow.setBounds(monitorRegion);
        ocrWindow.on('ready-to-show', () => {
            ocrWindow.show();
            logger.info('OCR 窗口已显示');
            updateWindowInfo()
        });
        ocrWindow.on('closed', () => {
            ocrWindow = null;
            logger.info('OCR 窗口已关闭');
        });
        // 当窗口停止移动或者大小变化时，记录位置和大小
        ocrWindow.on('will-move', (event) => {
            ocrWindow.webContents.send('ocr-window-status', 'loading');
            stopScreenMonitoring();
        });
        ocrWindow.on('moved', (event) => {
            updateWindowInfo()
        });

        ocrWindow.on('will-resize', (event) => {
            ocrWindow.webContents.send('ocr-window-status', 'loading');
            stopScreenMonitoring();
        });
        ocrWindow.on('resized', (event) => {
            updateWindowInfo()
        });
        return true;
    });
    ipcMain.handle('close-ocr-window', () => {
        logger.info('收到关闭 OCR 窗口请求');
        stopScreenMonitoring();
        if (worker) {
            worker.terminate();
            worker = null;
        }
        if (ocrWindow) {
            ocrWindow.close();
        } else {
            logger.warn('OCR 窗口不存在，无法关闭');
        }
    });


}

