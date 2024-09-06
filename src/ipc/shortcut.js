
import ChildProcessManager from '../utils/child_process_manager.js';
const { ipcMain, clipboard } = require('electron');
const { fork } = require('child_process');
const path = require('path');

// import Store from 'electron-store';
// 创建一个新的 Store 实例
// const store = new Store();

export function setupShortcut(win, sender) {
    // 存储当前注册的快捷键状态
    // let currentStatus = store.get('currentStatus', {});
    let currentStatus = {}
    let shortcutProcess = new ChildProcessManager(path.join(__dirname, '../../child_process/nut/handle_nut.js'))
    shortcutProcess.start()
    
    // 注册默认的快捷键
    shortcutProcess.send({ key: 'PAGE UP', script: '' });
    currentStatus['PAGE UP'] = '';
    shortcutProcess.send({ key: 'PAGE DOWN', script: '' });
    currentStatus['PAGE DOWN'] = '';
    // 打印当前快捷键状态并注册
    Object.entries(currentStatus).forEach(([key, value]) => {
        console.log(key + ': ' + value);
        shortcutProcess.send({ key, script: value });
    });

    shortcutProcess.on('message', (message) => {
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
        return shortcut in currentStatus;
    });
    // 处理注册快捷键的请求
    ipcMain.handle('register-shortcut', (event, shortcut, script) => {
        try {
            shortcutProcess.send({ key: shortcut, script: script });
            currentStatus[shortcut] = script || '';
            // store.set('currentStatus', currentStatus);
        } catch (error) {
            console.error(`Error registering shortcut: ${shortcut}`, error);
            return false;
        }
    });

    // 处理注销快捷键的请求
    ipcMain.handle('unregister-shortcut', (event, shortcut) => {
        try {
            shortcutProcess.send({ key: shortcut, remove: true });
            delete currentStatus[shortcut];
            // store.set('currentStatus', currentStatus);
            return true;
        } catch (error) {
            console.error(`Error unregistering shortcut: ${shortcut}`, error);
            return false;
        }
    });
}


