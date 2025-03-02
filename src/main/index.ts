import { electronApp, optimizer } from '@electron-toolkit/utils'
import { app } from 'electron'
import installExtension, { REDUX_DEVTOOLS } from 'electron-devtools-installer'

import { registerIpc } from './ipc'
import { knowledgeWatchService } from './services/KnowledgeWatchService'
import { registerShortcuts } from './services/ShortcutService'
import { TrayService } from './services/TrayService'
import { windowService } from './services/WindowService'
import { updateUserDataPath } from './utils/upgrade'

// Check for single instance lock
if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
} else {
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.

  app.whenReady().then(async () => {
    await updateUserDataPath()

    // Set app user model id for windows
    electronApp.setAppUserModelId(import.meta.env.VITE_MAIN_BUNDLE_ID || 'com.kangfenmao.CherryStudio')

    const mainWindow = windowService.createMainWindow()
    new TrayService()
    // 监听隐藏事件
    mainWindow.on('hide', async () => {
      await knowledgeWatchService.stop()
    })

    app.on('activate', async function () {
      const mainWindow = windowService.getMainWindow()
      if (!mainWindow || mainWindow.isDestroyed()) {
        windowService.createMainWindow()
      } else {
        windowService.showMainWindow()
      }
      await knowledgeWatchService.check()
    })

    registerShortcuts(mainWindow)

    registerIpc(mainWindow, app)

    // 等待窗口加载完成后再检查文件
    mainWindow.webContents.on('did-finish-load', async () => {
      await knowledgeWatchService.check()
    })
    if (process.env.NODE_ENV === 'development') {
      installExtension(REDUX_DEVTOOLS)
        .then((name) => console.log(`Added Extension:  ${name}`))
        .catch((err) => console.log('An error occurred: ', err))
    }
  })

  // Listen for second instance
  app.on('second-instance', () => {
    windowService.showMainWindow()
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  app.on('before-quit', async () => {
    app.isQuitting = true
    await knowledgeWatchService.stop()
  })

  // In this file you can include the rest of your app"s specific main process
  // code. You can also put them in separate files and require them here.
}
