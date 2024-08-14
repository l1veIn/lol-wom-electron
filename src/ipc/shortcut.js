
import ChildProcessManager from '../utils/child_process_manager.js';
const { ipcMain, clipboard } = require('electron');
const { fork } = require('child_process');
const path = require('path');

export function setupShortcut(win, sender) {
    // 存储当前注册的快捷键状态
    let currentStatus = {};
    let shortcutProcess = new ChildProcessManager(path.join(__dirname, '../../child_process/nut/handle_nut.js'))
    shortcutProcess.start()
    shortcutProcess.on('message', (message) => {
        if (message.sendClipboard2Game) {
            sender.send({...message,data: clipboard.readText()})
        }else{
            sender.send({...message})
        }
    })
    // 处理获取快捷键状态的请求
    ipcMain.handle('get-shortcut-status', (event, shortcut) => {
        return currentStatus[shortcut] || false;
    });
    // 处理注册快捷键的请求
    ipcMain.handle('register-shortcut', (event, shortcut, script) => {
        try {
            shortcutProcess.send({ key: shortcut, script: script });
            currentStatus[shortcut] = true;
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
            return true;
        } catch (error) {
            console.error(`Error unregistering shortcut: ${shortcut}`, error);
            return false;
        }
    });
}


