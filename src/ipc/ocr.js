const { ipcMain, clipboard, BrowserWindow, screen, desktopCapturer } = require('electron');
const { fork } = require('child_process');
import { join } from 'path'
const path = require('path');
import icon from '../../resources/icon.png?asset'
import logger from '../utils/logger';

const sharp = require('sharp');
import { app } from 'electron';
import fs from 'fs/promises';
const { Worker } = require('worker_threads');


export function setupOCR(win) {
    logger.info('开始设置 OCR');
    let ocrWindow;
    let lastImage;
    let worker;
    let intervalId;

    let monitorRegion = { x: 200, y: 300, width: 300, height: 400 };

    function stopScreenMonitoring() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        if (lastImage) {
            lastImage = null;
        }
        logger.info('停止屏幕监控');
    }
    async function startScreenMonitoring() {
        const MONITOR_INTERVAL = 1000; // 每秒检查一次
        const CHANGE_THRESHOLD = 0.1; // 10%的像素变化被认为是明显变化

        intervalId = setInterval(async () => {
            try {
                const sources = await desktopCapturer.getSources({
                    types: ['screen'],
                    thumbnailSize: { width: 1920, height: 1080 }
                });
                const primaryDisplay = sources[0];

                if (primaryDisplay) {
                    const fullImage = primaryDisplay.thumbnail;
                    const croppedImage = await sharp(fullImage.toPNG())
                        .extract({
                            left: monitorRegion.x,
                            top: monitorRegion.y,
                            width: monitorRegion.width,
                            height: monitorRegion.height
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
                                const screenshotPath = path.join(app.getPath('pictures'), `screenshot-${Date.now()}.png`);
                                await sharp(croppedImage).toFile(screenshotPath);
                                console.log(`检测到变化,截图已保存: ${screenshotPath}`);
                            }
                        });
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
            width: 400,
            height: 300,
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
        ocrWindow.setMinimumSize(100, 100)
        ocrWindow.setAlwaysOnTop(true, 'screen-saver')
        ocrWindow.loadURL('http://localhost:5173/ocr');
        ocrWindow.on('ready-to-show', () => {
            ocrWindow.show();
            logger.info('OCR 窗口已显示');
        });
        ocrWindow.on('closed', () => {
            ocrWindow = null;
            logger.info('OCR 窗口已关闭');
        });
        let debounceTimer;
        const debounceDelay = 500; // 500毫秒的防抖延迟


        function updateWindowInfo() {
            if (!ocrWindow) return;
            stopScreenMonitoring();
            const bounds = ocrWindow.getBounds();
            monitorRegion = {
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height
            };
            ocrWindow.webContents.send('ocr-window-info', monitorRegion);
            logger.info('OCR窗口信息已更新', monitorRegion);
            startScreenMonitoring().catch(err => console.error('启动屏幕监控失败:', err));;
        }

        // 当窗口停止移动或者大小变化时，记录位置和大小
        ocrWindow.on('move', (event) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(updateWindowInfo, debounceDelay);
        });
        ocrWindow.on('resize', (event) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(updateWindowInfo, debounceDelay);
        });
        return true;
    });
    ipcMain.handle('ocr-message', (_, data) => {
        logger.info('收到 OCR 消息', { data });
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

