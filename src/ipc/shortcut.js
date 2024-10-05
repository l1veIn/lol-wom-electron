
import ChildProcessManager from '../utils/child_process_manager.js';
const { ipcMain, clipboard } = require('electron');
const { fork } = require('child_process');
const path = require('path');

import logger from '../utils/logger';
import fs from 'fs';

let current_text_path = ''
let text_line = []
let text_index = 0

function getText(text_path) {
    if (current_text_path !== text_path) {
        current_text_path = text_path
        const fullText = fs.readFileSync(text_path, 'utf8')
        text_line = splitChineseTextIntoLines(fullText, 30, 50)
        text_index = 0
    }
    if (text_index >= text_line.length) {
        text_index = 0
    }
    return text_line[text_index++]
}

function splitChineseTextIntoLines(text, minLength, maxLength) {
    const lines = []
    let currentLine = ''

    for (const char of text) {
        if (currentLine.length < maxLength) {
            currentLine += char
        } else {
            lines.push(currentLine)
            currentLine = char
        }

        // 如果遇到标点符号且当前行长度已达到最小长度，则换行
        if (isPunctuation(char) && currentLine.length >= minLength) {
            lines.push(currentLine)
            currentLine = ''
        }
    }

    if (currentLine) {
        lines.push(currentLine)
    }

    return lines
}

function isPunctuation(char) {
    const punctuations = `。，、；：？！""''（）《》【】`
    return punctuations.includes(char)
}

export function setupShortcut(win, sender, ocrInstance) {
    // 存储当前注册的快捷键状态
    // let currentStatus = store.get('currentStatus', {});
    logger.info('开始设置快捷键');
    let currentStatus = {}
    let shortcutProcess = new ChildProcessManager(path.join(__dirname, '../../child_process/nut/handle_nut.js'))
    shortcutProcess.start()
    logger.info('快捷键子进程已启动');

    // 注册默认的快捷键
    currentStatus['PAGE UP'] = '';
    currentStatus['PAGE DOWN'] = '';
    // 打印当前快捷键状态并注册
    Object.entries(currentStatus).forEach(([key, value]) => {
        console.log(key + ': ' + value);
        logger.debug(`注册快捷键: ${key} - ${value}`);
        shortcutProcess.send({ key, script: value });
    });

    shortcutProcess.on('message', (message) => {
        logger.debug('收到子进程消息:', message);
        if (message.sendClipboard2Game || message.sendClipboard2GameAll) {
            let text = ''
            if (message.use_text && message.text_path) {
                text = getText(message.text_path)
            } else {
                text = clipboard.readText()
            }
            sender.send({ ...message, data: text })
        } else if (message.runOCR) {
            if (ocrInstance.ocrWindow) {
                ocrInstance.performCheck()
            }
        } else if (message.onPageUp) {
            win.webContents.send('press_page_up')
        } else if (message.onPageDown) {
            win.webContents.send('press_page_down')
        } else {
            sender.send({ ...message })
        }
    })
    // 处理获取快捷键状态的请求
    ipcMain.handle('get-shortcut-status', (event, shortcut) => {
        logger.debug(`获取快捷键状态: ${shortcut}`);
        return shortcut in currentStatus;
    });
    // 处理注册快捷键的请求
    ipcMain.handle('register-shortcut', (event, shortcut, script, censor_active, use_text, text_path, press_interval ) => {
        // let { censor_active, use_text, text_path, press_interval } = args
        // console.log('register-shortcut', args)
        try {
            logger.info(`注册快捷键: ${shortcut}`);
            console.log('register-shortcut', shortcut, script);
            shortcutProcess.send({ key: shortcut, script: script || 'sendClipboard2Game', censor_active, use_text, text_path, press_interval });
            currentStatus[shortcut] = script || 'sendClipboard2Game';
            // store.set('currentStatus', currentStatus);
        } catch (error) {
            console.error(`Error registering shortcut: ${shortcut}`, error);
            logger.error(`注册快捷键失败: ${shortcut}`, error);
            return false;
        }
    });

    // 处理注销快捷键的请求
    ipcMain.handle('unregister-shortcut', (event, shortcut) => {
        try {
            logger.info(`注销快捷键: ${shortcut}`);
            if (currentStatus[shortcut]) {
                shortcutProcess.send({ key: shortcut, remove: true });
                delete currentStatus[shortcut];
            }
            // store.set('currentStatus', currentStatus);
            return true;
        } catch (error) {
            console.error(`Error unregistering shortcut: ${shortcut}`, error);
            logger.error(`注销快捷键失败: ${shortcut}`, error);
            return false;
        }
    });
}


