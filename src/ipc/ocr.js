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
    constructor(win) {
        this.working = false;
        this.ocr_processing = false;
        this.screenSize = screen.getPrimaryDisplay().size;
        this.ocrWindow = null;
        this.ocrEngine = null;
        this.monitorRegion = { x: 0, y: 0, width: 400, height: 300 };
        this.intervalId = null;
        this.lastImage = null;
        this.moving = false;
        this.config = {}
        this.screenView = { x: 0, y: 0, width: this.screenSize.width, height: this.screenSize.height };
        this.win = win
        this.setupIPCHandlers();
    }
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    setupIPCHandlers() {
        ipcMain.handle('start-ocr', this.handleStartOCR.bind(this));
        ipcMain.handle('close-ocr-window', this.handleCloseOCRWindow.bind(this));
        ipcMain.handle('ocr-window-fixed', this.handleOCRWindowFixed.bind(this));
        ipcMain.handle('apply-ocr', this.applyOCR.bind(this));
        ipcMain.handle('set-ocr-window-config', this.setOCRWindowConfig.bind(this));
    }
    setOCRWindowConfig(_, data) {
        logger.info('收到设置 OCR 窗口配置请求', data);
        if (this.ocrWindow && this.ocrEngine) {
            this.config = data
            this.ocrWindow.webContents.send('ocr-window-config', data);
            if (this.config.auto_start) {
                this.startWorking()
            } else {
                this.stopWorking()
            }
        }

    }
    async handleStartOCR(_, data) {
        logger.info('收到启动 OCR 请求', { data });
        this.createOCRWindow(data);
        return true;
    }

    createOCRWindow(data) {
        // ... 创建OCR窗口的代码 ...
        if (data.position) {
            this.monitorRegion = data.position
        }
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
            this.config = data
            this.initializeOCREngine()
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
        const bounds = this.ocrWindow.getBounds();
        this.monitorRegion = { ...bounds };
        this.ocrWindow.webContents.send('ocr-window-info', bounds);
        logger.info('OCR窗口信息已更新', this.monitorRegion);
        // console.log('OCR窗口信息已更新', this.win);
        this.win.webContents.send('setStorage', { key: 'ocr-window-position', value: bounds });
    }
    initializeOCREngine() {
        let that = this
        // ... 初始化OCR引擎的代码 ...
        let ocrEnginePath = path.join(__dirname, '../../child_process/ocr/ocr_engine');
        let args = ['--models=' + path.join(ocrEnginePath, './models')]
        if (this.config.lang == 'ko') {
            args.push('--det=ch_PP-OCRv3_det_infer.onnx')
            args.push('--cls=ch_ppocr_mobile_v2.0_cls_infer.onnx')
            args.push('--rec=rec_korean_PP-OCRv3_infer.onnx')
            args.push('--keys=dict_korean.txt')
        } else if (this.config.lang == 'ja') {
            args.push('--det=ch_PP-OCRv3_det_infer.onnx')
            args.push('--cls=ch_ppocr_mobile_v2.0_cls_infer.onnx')
            args.push('--rec=rec_japan_PP-OCRv3_infer.onnx')
            args.push('--keys=dict_japan.txt')
        }
        this.ocrEngine = spawn(path.join(ocrEnginePath, './RapidOCR-json.exe'), args);
        this.ocrEngine.stdout.on('data', async (data) => {
            const result = data.toString().trim();
            console.log(`OCR引擎输出: ${result}`);
            try {
                JSON.parse(result);
                that.ocrWindow.webContents.send('ocr-result', result);
            } catch (e) {
                that.setOCRWindowConfig(null, that.config)
                // that.startWorking()
            }
        });
        this.ocrEngine.stderr.on('data', (data) => {
            console.error(`OCR引擎错误: ${data}`);
            this.ocrWindow.webContents.send('ocr-error', data.toString());
        });
        this.ocrEngine.on('close', (code) => {
            console.log(`OCR引擎进程退出,退出码 ${code}`);
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
    async applyOCR(_, data) {
        console.log('applyOCR', data)
        let croppedImage = await this.getBoundingImage()
        this.ocrWindow.webContents.send('ocr-window-status', 'loading');
        // let date = Date.now()
        const screenshotPath = path.join(app.getPath('pictures'), `screenshot.png`);
        const screenshotPathRemoveBlack = path.join(app.getPath('pictures'), `screenshot_remove_black.png`);
        await sharp(croppedImage).toFile(screenshotPath);
        console.log(`截图已保存: ${screenshotPath}`);
        await removeBlackOverlayAndWhiteText(screenshotPath, screenshotPathRemoveBlack, data.blackOverlay);
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
        this.stopWorking();
        this.ocr_processing = false
        this.lastImage = null
        if (this.ocrEngine) {
            this.ocrEngine.kill()
            this.ocrEngine = null
        }
        this.closeOCRWindow();
    }
    closeOCRWindow() {
        if (this.ocrWindow) {
            this.ocrWindow.close();
            this.ocrWindow = null;
        }
    }
    async startWorking() {
        // await this.sleep(1000)
        if (!this.working) {
            this.working = true;
            this.scheduleNextCheck();
        }
    }

    async scheduleNextCheck() {
        if (!this.working) return;

        let time = await this.performCheck();
        setTimeout(() => this.scheduleNextCheck(), time || 1000); // 1秒后再次检查
    }

    async performCheck() {
        if (!this.ocrWindow || !this.ocrEngine) {
            console.log('ocrWindow or ocrEngine is null');
            return 300;
        }

        if (this.moving) {
            console.log('moving');
            this.ocrWindow.webContents.send('ocr-window-status', 'loading');
            return 300;
        }

        if (this.ocr_processing) {
            console.log('ocr_processing');
            return 300;
        }

        let croppedImage = await this.getBoundingImage();
        let hasChanged = await getImageDiff(this.lastImage, croppedImage, 0.001);

        if (hasChanged) {
            console.log('hasChanged!!');
            this.ocrWindow.webContents.send('need-ocr');
            this.ocr_processing = true;
            return 300;
        } else {
            // console.log('working');
            return 1000;
        }
    }
    stopWorking() {
        this.working = false;
    }
}

export function setupOCR(win) {
    return new OCRService(win);
}