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
import fs from 'fs/promises';

let replacementRules = {};
export function setupASR(win) {
  logger.info('开始设置 ASR');
  let lyricsWindow
  let asr_config = {}
  let asrProcess = new ChildProcessManager(path.join(__dirname, '../../child_process/asr_process/asr_process.js'))


  asrProcess.on('message', (res) => {
    logger.info('get ASR message', res);
    let text = res.text || res
    let speaker = res.speaker || ''
    // 应用替换规则
    let processedMessage = applyReplacementRules(text);
    if (asr_config.censor_active) {
      processedMessage = censor(processedMessage)
    }
    if (asr_config.use_translate) {
      console.log('to lang', asr_config.langPickerIndex)
    }

    clipboard.writeText(processedMessage);
    win.webContents.send('asr-message', { text: processedMessage, speaker: speaker });
    if (lyricsWindow) {
      lyricsWindow.webContents.send('asr-message', { text: processedMessage, speaker: speaker });
    }
  });

  asrProcess.on('exit', () => {
    asrProcess.stop();
    logger.info('ASR 进程退出');
  });

  ipcMain.handle('start-asr', async (_, data) => {
    logger.info('收到启动 ASR 请求', { data });
    asr_config = data
    if (!asrProcess.exist()) {
      // 读取替换规则文件
      if (data.modelDir) {
        try {
          const ruleContent = await fs.readFile(path.join(data.modelDir, 'rules.json'), 'utf-8');
          replacementRules = JSON.parse(ruleContent);
          logger.info('成功读取替换规则', { rules: replacementRules });
        } catch (error) {
          logger.error('读取替换规则文件失败', { error });
        }
      }

      asrProcess.start()
      asrProcess.send({ ...data, logPath: join(app.getPath('userData'), 'logs') });
      logger.info('ASR 进程已启动并发送数据');
      return true;
    } else {
      logger.warn('ASR 进程已存在，无法启动新进程');
      return false;
    }
  });

  ipcMain.handle('stop-asr', () => {
    asr_config = {}
    logger.info('收到停止 ASR 请求');
    if (asrProcess) {
      asrProcess.send('stop-asr');
      logger.info('已发送停止 ASR 命令');
    } else {
      logger.warn('ASR 进程不存在，无法停止');
    }
  });

  ipcMain.handle('get-asr-status', () => {
    const status = asrProcess.exist();
    logger.info('获取 ASR 状态', { status });
    return status;
  });

  ipcMain.handle('get-asr-devices', () => {
    const devices = portAudio.getDevices();
    logger.info('获取 ASR 设备列表', { deviceCount: devices.length });
    return devices;
  });

  ipcMain.handle('open-lyric-window', (_, config) => {
    logger.info('收到打开歌词窗口请求', { config });
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    if (!lyricsWindow) {
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
        lyricsWindow.loadURL('http://localhost:5173/lyrics')
      } else {
        lyricsWindow.loadFile(join(__dirname, '../renderer/index.html/lyrics'))
      }
      lyricsWindow.setAlwaysOnTop(true, 'screen-saver')
      if (config.position) {
        lyricsWindow.setBounds(config.position)
      }
      lyricsWindow.on('ready-to-show', () => {
        lyricsWindow.webContents.send('config', config);
        lyricsWindow.show()
        logger.info('歌词窗口已显示');
      })
      lyricsWindow.on('moved', (event) => {
        win.webContents.send('setStorage', { key: 'lyrics-window-position', value: lyricsWindow.getBounds() });
      });
      lyricsWindow.on('resized', (event) => {
        win.webContents.send('setStorage', { key: 'lyrics-window-position', value: lyricsWindow.getBounds() });
      });
      lyricsWindow.on('closed', () => {
        lyricsWindow = null
        logger.info('歌词窗口已关闭');
      })
      logger.info('歌词窗口已创建');
    } else {
      lyricsWindow.webContents.send('config', config);
      lyricsWindow.show()
      logger.info('已有歌词窗口，显示现有窗口');
    }
  });

  ipcMain.handle('close-lyric-window', () => {
    logger.info('收到关闭歌词窗口请求');
    if (lyricsWindow) {
      try {
        lyricsWindow.hide()
        logger.info('歌词窗口已隐藏');
      } catch (error) {
        logger.error('关闭歌词窗口时出错', { error });
      }
    } else {
      logger.warn('歌词窗口不存在，无法关闭');
    }
  });

  ipcMain.handle('set-ignore-mouse-events', (event, ignore, options) => {
    logger.info('设置忽略鼠标事件', { ignore, options });
    if (lyricsWindow) {
      lyricsWindow.setIgnoreMouseEvents(ignore, options);
    } else {
      logger.warn('歌词窗口不存在，无法设置忽略鼠标事件');
    }
  });

  logger.info('ASR 设置完成');
}

function applyReplacementRules(message) {
  let processedMessage = message;
  for (const [key, value] of Object.entries(replacementRules)) {
    processedMessage = processedMessage.replace(new RegExp(key, 'g'), value);
  }
  return processedMessage;
}