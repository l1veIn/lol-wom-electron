import { BrowserWindow, app } from 'electron';
import { join } from 'path'
import { setupIPC } from './ipc';
import { is } from '@electron-toolkit/utils'

import icon from '../../resources/icon.png?asset'
import defaultPage from '../../resources/default.html?asset'
import _ from 'lodash'
export function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 400,
    height: 800,
    maximizable: false,
    autoHideMenuBar: true,
    resizable: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: 'rgba(0,0,0,0)',
      height: 35,
      symbolColor: 'white'
    },
    movable: true,
    // alwaysOnTop: true,
    show: false,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // 设置最小尺寸
  mainWindow.setMinimumSize(400, 800)

  // 设置最大尺寸
  mainWindow.setMaximumSize(800, 1600)

  setupIPC(mainWindow);
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && import.meta.env['MAIN_VITE_ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL("http://localhost:8080/lol-wom-helper/")
    // mainWindow.loadURL("https://kaihei.online/lol-wom-helper")
  } else {
    const defaultUrl = "https://kaihei.online/lol-wom-helper";
    mainWindow.loadURL(defaultUrl);
    // const checkUrlAvailability = async (url) => {
    //   try {
    //     const response = await fetch(url, { method: 'HEAD' });
    //     return response.ok;
    //   } catch (error) {
    //     return false;
    //   }
    // };

    // const loadUrlOrDefault = async () => {
    //   const isAvailable = await checkUrlAvailability(defaultUrl);
    //   if (isAvailable) {
    //     mainWindow.loadURL(defaultUrl);
    //   } else {
    //     mainWindow.loadFile(defaultPage);
    //   }
    // };
    // loadUrlOrDefault();
  }
  // let lastPosition = { x: 0, y: 0 }

  // mainWindow.on('move', () => {
  //   const currentPosition = mainWindow.getPosition()
  //   const deltaX = currentPosition[0] - lastPosition.x
  //   const deltaY = currentPosition[1] - lastPosition.y

  //   mainWindow.webContents.send('window-moved', { deltaX, deltaY })

  //   lastPosition = { x: currentPosition[0], y: currentPosition[1] }
  // })

  let lastPosition = { x: 0, y: 0 }

  const sendWindowMoved = _.throttle((deltaX, deltaY) => {
    mainWindow.webContents.send('window-moved', { deltaX, deltaY })
  }, 16) // 约60fps，可以根据需要调整

  mainWindow.on('move', () => {
    const currentPosition = mainWindow.getPosition()
    const deltaX = currentPosition[0] - lastPosition.x
    const deltaY = currentPosition[1] - lastPosition.y

    sendWindowMoved(deltaX, deltaY)

    lastPosition = { x: currentPosition[0], y: currentPosition[1] }
  })

  mainWindow.on('closed', () => {
    app.quit()
  })
}
