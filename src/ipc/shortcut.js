const { ipcMain, globalShortcut } = require('electron');
const { fork } = require('child_process');
const path = require('path');

export function setupShortcut(win) {
    // 存储当前注册的快捷键状态
    let currentStatus = {};
    let shortcutProcess = fork(path.join(__dirname, '../../child_process/nut/handle_nut.js'));
    // 处理获取快捷键状态的请求
    ipcMain.handle('get-shortcut-status', (event, shortcut) => {
        return currentStatus[shortcut] || false;
    });
    // 处理注册快捷键的请求
    ipcMain.handle('register-shortcut', (event, shortcut) => {
        try {
            shortcutProcess.send({key: shortcut,script:path.join(__dirname, '../../child_process/nut/sendMsg.js')});
            currentStatus[shortcut] = true;
        } catch (error) {
            console.error(`Error registering shortcut: ${shortcut}`, error);
            return false;
        }
    });

    // 处理注销快捷键的请求
    ipcMain.handle('unregister-shortcut', (event, shortcut) => {
        try {
            shortcutProcess.send({key: shortcut,remove:true});
            delete currentStatus[shortcut];
            return true;
        } catch (error) {
            console.error(`Error unregistering shortcut: ${shortcut}`, error);
            return false;
        }
    });
}