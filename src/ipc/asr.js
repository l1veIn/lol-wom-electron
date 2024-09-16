import ChildProcessManager from '../utils/child_process_manager.js';
import { is } from '@electron-toolkit/utils'
const { ipcMain, clipboard, BrowserWindow, screen } = require('electron');
const { fork } = require('child_process');
import { join } from 'path'
const path = require('path');
const portAudio = require('naudiodon2');
import icon from '../../resources/icon.png?asset'
import logger from '../utils/logger';
import { app } from 'electron';

export function setupASR(win) {
  logger.info('开始设置 ASR');
  let lyricsWindow
  let asrProcess = new ChildProcessManager(path.join(__dirname, '../../child_process/asr_process/asr_process.js'))
  
  asrProcess.on('message', (message) => {
    logger.debug('收到 ASR 进程消息', { message });
    clipboard.writeText(message);
    win.webContents.send('asr-message', message);
    if (lyricsWindow) {
      lyricsWindow.webContents.send('asr-message', message);
    }
  });
  
  asrProcess.on('exit', () => {
    asrProcess.stop();
    logger.info('ASR 进程退出');
  });

  ipcMain.handle('start-asr', (_, data) => {
    logger.info('收到启动 ASR 请求', { data });
    if (!asrProcess.exist()) {
      asrProcess.start()
      asrProcess.send({...data, logPath: join(app.getPath('userData'), 'logs')});
      logger.debug('ASR 进程已启动并发送数据');
      return true;
    } else {
      logger.warn('ASR 进程已存在，无法启动新进程');
      return false;
    }
  });

  ipcMain.handle('stop-asr', () => {
    logger.info('收到停止 ASR 请求');
    if (asrProcess) {
      asrProcess.send('stop-asr');
      logger.debug('已发送停止 ASR 命令');
    } else {
      logger.warn('ASR 进程不存在，无法停止');
    }
  });

  ipcMain.handle('get-asr-status', () => {
    const status = asrProcess.exist();
    logger.debug('获取 ASR 状态', { status });
    return status;
  });

  ipcMain.handle('get-asr-devices', () => {
    const devices = portAudio.getDevices();
    logger.debug('获取 ASR 设备列表', { deviceCount: devices.length });
    return devices;
  });

  ipcMain.handle('open-lyric-window', () => {
    logger.info('收到打开歌词窗口请求');
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    if(!lyricsWindow){
      lyricsWindow = new BrowserWindow({
        width: 500,
        height: 100,
        x: width - 520, // 20px margin from right
        y: height - 120, // 20px margin from bottom
        frame: false,
        transparent: true,
        icon,
        show: false,
        webPreferences: {
          preload: join(__dirname, '../preload/index.js'),
          nodeIntegration: true,
          contextIsolation: false
        }
      }) 
      lyricsWindow.setIgnoreMouseEvents(false);
      lyricsWindow.setBackgroundColor("rgba(0, 0, 0, 0)")
      if (is.dev) {
        lyricsWindow.loadURL('http://localhost:5173/')
      } else {
        lyricsWindow.loadFile(join(__dirname, '../renderer/index.html'))
      }
      lyricsWindow.setAlwaysOnTop(true, 'screen-saver')
      lyricsWindow.on('ready-to-show', () => {
        lyricsWindow.show()
        logger.debug('歌词窗口已显示');
      })
      lyricsWindow.on('closed', () => {
        lyricsWindow = null
        logger.debug('歌词窗口已关闭');
      })
      logger.info('歌词窗口已创建');
    } else {
      lyricsWindow.show()
      logger.debug('已有歌词窗口，显示现有窗口');
    }
  });

  ipcMain.handle('close-lyric-window', () => {
    logger.info('收到关闭歌词窗口请求');
    if(lyricsWindow){
      try {
        lyricsWindow.hide()
        logger.debug('歌词窗口已隐藏');
      } catch (error) {
        logger.error('关闭歌词窗口时出错', { error });
      }
    } else {
      logger.warn('歌词窗口不存在，无法关闭');
    }
  });

  ipcMain.handle('set-ignore-mouse-events', (event, ignore, options) => {
    logger.debug('设置忽略鼠标事件', { ignore, options });
    if (lyricsWindow) {
      lyricsWindow.setIgnoreMouseEvents(ignore, options);
    } else {
      logger.warn('歌词窗口不存在，无法设置忽略鼠标事件');
    }
  });

  logger.info('ASR 设置完成');
}