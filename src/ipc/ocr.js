const { ipcMain, BrowserWindow, screen, desktopCapturer } = require('electron');
const { spawn } = require('child_process');
const { join } = require('path');
const path = require('path');
const sharp = require('sharp');
const { app } = require('electron');

import icon from '../../resources/icon.png?asset';
import logger from '../utils/logger';
import { removeBlackOverlayAndWhiteText, getImageDiff } from '../utils/imageProcessing';

class OCRService {
    constructor() {
        this.working = false;
        this.ocr_processing = false;
        this.screenSize = screen.getPrimaryDisplay().size;
        this.ocrWindow = null;
        this.ocrEngine = null;
        this.monitorRegion = { x: 0, y: 0, width: 400, height: 300 };
        this.intervalId = null;
        this.lastImage = null;
        this.moving = false;
        this.screenView = { x: 0, y: 0, width: this.screenSize.width, height: this.screenSize.height };
        this.setupIPCHandlers();
    }
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    setupIPCHandlers() {
        ipcMain.handle('start-ocr', this.handleStartOCR.bind(this));
        ipcMain.handle('close-ocr-window', this.handleCloseOCRWindow.bind(this));
        ipcMain.handle('ocr-window-fixed', this.handleOCRWindowFixed.bind(this));
    }

    async handleStartOCR(_, data) {
        logger.info('收到启动 OCR 请求', { data });
        this.createOCRWindow();
        this.initializeOCREngine();
        this.startWorking();
        return true;
    }

    createOCRWindow() {
        // ... 创建OCR窗口的代码 ...
        this.ocrWindow = new BrowserWindow({
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
        this.ocrWindow.setMinimumSize(100, 100)
        this.ocrWindow.setAlwaysOnTop(true, 'screen-saver')
        this.ocrWindow.loadURL('http://localhost:5173/ocr');
        this.ocrWindow.setBounds(this.monitorRegion);
        
        this.ocrWindow.show();
        this.ocrWindow.on('ready-to-show', () => {
            this.ocrWindow.show();
            logger.info('OCR 窗口已显示');
            this.updateWindowInfo()
        });
        this.ocrWindow.on('closed', () => {
            this.ocrWindow = null;
            logger.info('OCR 窗口已关闭');
        });
        // 当窗口停止移动或者大小变化时，记录位置和大小
        this.ocrWindow.on('will-move', (event) => {
            this.moving = true;
        });
        this.ocrWindow.on('moved', (event) => {
            this.updateWindowInfo()
            this.moving = false;
        });

        this.ocrWindow.on('will-resize', (event) => {
            this.moving = true;
        });
        this.ocrWindow.on('resized', (event) => {
            this.updateWindowInfo()
            this.moving = false;
        });
    }
    updateWindowInfo() {
        if (!this.ocrWindow) return;
        // this.ocrWindow.webContents.send('ocr-window-status', 'loading');
        const bounds = this.ocrWindow.getBounds();
        this.monitorRegion = { ...bounds };
        this.ocrWindow.webContents.send('ocr-window-info', bounds);
        logger.info('OCR窗口信息已更新', this.monitorRegion);
        // this.startScreenMonitoring().catch(err => console.error('启动屏幕监控失败:', err));;
    }
    initializeOCREngine() {
        // ... 初始化OCR引擎的代码 ...
        let ocrEnginePath = path.join(__dirname, '../../child_process/ocr/ocr_engine');
        this.ocrEngine = spawn(path.join(ocrEnginePath, './RapidOCR-json.exe'), ['--models=' + path.join(ocrEnginePath, './models')]);
        this.ocrEngine.stdout.on('data', async (data) => {
            const result = data.toString().trim();
            console.log(`OCR引擎输出: ${result}`);
            this.ocrWindow.webContents.send('ocr-result', result);
            // this.ocr_processing = false
        });
        this.ocrEngine.stderr.on('data', (data) => {
            console.error(`OCR引擎错误: ${data}`);
            this.ocrWindow.webContents.send('ocr-error', data.toString());
            this.ocr_processing = false
        });
        this.ocrEngine.on('close', (code) => {
            console.log(`OCR引擎进程退出,退出码 ${code}`);
            this.ocr_processing = false
        });
    }
    async getBoundingImage() {
        let sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: this.screenSize
        });
        let primaryDisplay = sources[0];
        if (primaryDisplay) {
            let fullImage = primaryDisplay.thumbnail;
            // 求monitorRegion和screenView的交集
            let intersection = {
                x: Math.max(this.monitorRegion.x, this.screenView.x),
                y: Math.max(this.monitorRegion.y, this.screenView.y),
                width: Math.min(this.monitorRegion.x + this.monitorRegion.width, this.screenView.x + this.screenView.width) - Math.max(this.monitorRegion.x, this.screenView.x),
                height: Math.min(this.monitorRegion.y + this.monitorRegion.height, this.screenView.y + this.screenView.height) - Math.max(this.monitorRegion.y, this.screenView.y)
            };
            let croppedImage = await sharp(fullImage.toPNG())
                .extract({
                    left: intersection.x,
                    top: intersection.y,
                    width: intersection.width,
                    height: intersection.height
                })
                .toBuffer();
            return croppedImage
        } else {
            return null
        }
    }
    async applyOCR(croppedImage) {
        
        this.ocrWindow.webContents.send('ocr-window-status', 'loading')
        // this.lastImage = croppedImage
        this.ocr_processing = true
        // let date = Date.now()
        const screenshotPath = path.join(app.getPath('pictures'), `screenshot.png`);
        const screenshotPathRemoveBlack = path.join(app.getPath('pictures'), `screenshot_remove_black.png`);
        await sharp(croppedImage).toFile(screenshotPath);
        console.log(`截图已保存: ${screenshotPath}`);
        await removeBlackOverlayAndWhiteText(screenshotPath, screenshotPathRemoveBlack);
        // const base64Image = croppedImage.toString('base64');
        this.ocrEngine.stdin.write(JSON.stringify({ image_path: screenshotPathRemoveBlack }) + '\n');
        // ocrEngine.stdin.write(JSON.stringify({ image_base64: base64Image }) + '\n');
    }
    async handleOCRWindowFixed(_, data) {
        this.lastImage = await this.getBoundingImage()
        this.ocr_processing = false
    }
    handleCloseOCRWindow() {
        logger.info('收到关闭 OCR 窗口请求');
        this.ocr_processing = false
        this.lastImage = null
        if(this.ocrEngine){ 
            this.ocrEngine.kill()
            this.ocrEngine = null
        }
        this.stopWorking();
        this.closeOCRWindow();
    }
    closeOCRWindow() {
        if (this.ocrWindow) {
            this.ocrWindow.close();
            this.ocrWindow = null;
        }
    }

    async startWorking() {
        await this.sleep(1000)
        this.working = true;
        while (this.working) {

            if(!this.ocrWindow || !this.ocrEngine ){
                console.log('ocrWindow or ocrEngine is null')
                await this.sleep(300)
                continue
            }

            if(this.moving){
                // 如果窗口正在移动，则等待300ms
                console.log('moving')
                this.ocrWindow.webContents.send('ocr-window-status', 'loading')
                await this.sleep(300)
                continue
            }

            if(this.ocr_processing){
                // 如果ocr正在处理，则等待300ms
                console.log('ocr_processing')
                // this.ocrWindow.webContents.send('ocr-window-status', 'loading')
                await this.sleep(300)
                continue
            }
            let croppedImage = await this.getBoundingImage() 
            let hasChanged = await getImageDiff(this.lastImage, croppedImage, 0.01)
            if (hasChanged) {
                croppedImage = await this.getBoundingImage() 
                console.log('hasChanged!!')
                this.applyOCR(croppedImage)
                continue
            }
            console.log('working')
            await this.sleep(1000)
        }
    }
    stopWorking() {
        this.working = false;
    }
    // ... 其他处理方法 ...
}

export function setupOCR() {
    return new OCRService();
}