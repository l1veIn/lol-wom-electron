const { ipcMain, globalShortcut } = require('electron');

// 存储当前注册的快捷键状态
let currentStatus = {};

export function setupShortcut(win) {
    // 处理获取快捷键状态的请求
    ipcMain.handle('get-shortcut-status', (event, shortcut) => {
        return currentStatus[shortcut] || false;
    });

    // 处理注册快捷键的请求
    ipcMain.handle('register-shortcut', (event, shortcut) => {
        try {
            const success = globalShortcut.register(shortcut, () => {
                // 当快捷键被触发时，发送消息到渲染进程
                // win.webContents.send('shortcut-triggered', shortcut);
                console.log(`Shortcut ${shortcut} triggered`);
            });

            if (success) {
                currentStatus[shortcut] = true;
                return true;
            } else {
                console.error(`Failed to register shortcut: ${shortcut}`);
                return false;
            }
        } catch (error) {
            console.error(`Error registering shortcut: ${shortcut}`, error);
            return false;
        }
    });

    // 处理注销快捷键的请求
    ipcMain.handle('unregister-shortcut', (event, shortcut) => {
        try {
            globalShortcut.unregister(shortcut);
            delete currentStatus[shortcut];
            return true;
        } catch (error) {
            console.error(`Error unregistering shortcut: ${shortcut}`, error);
            return false;
        }
    });
}