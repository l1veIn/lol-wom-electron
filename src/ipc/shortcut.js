
import ChildProcessManager from '../utils/child_process_manager.js';
const { ipcMain, clipboard } = require('electron');
const { fork } = require('child_process');
const path = require('path');

import logger from '../utils/logger';

// import Store from 'electron-store';
// 创建一个新的 Store 实例
// const store = new Store();

export function setupShortcut(win, sender) {
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
        if (message.sendClipboard2Game) {
            sender.send({ ...message, data: clipboard.readText() })
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
    ipcMain.handle('register-shortcut', (event, shortcut, script) => {
        try {
            logger.info(`注册快捷键: ${shortcut}`);
            shortcutProcess.send({ key: shortcut, script: script });
            currentStatus[shortcut] = script || '';
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
            shortcutProcess.send({ key: shortcut, remove: true });
            delete currentStatus[shortcut];
            // store.set('currentStatus', currentStatus);
            return true;
        } catch (error) {
            console.error(`Error unregistering shortcut: ${shortcut}`, error);
            logger.error(`注销快捷键失败: ${shortcut}`, error);
            return false;
        }
    });
}


