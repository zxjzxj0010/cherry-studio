import * as fs from 'node:fs'

import { WatchItem } from '@main/utils/watcher'
import chokidar, { FSWatcher } from 'chokidar'

import { windowService } from './WindowService'

export interface FileInfo {
  fileType: 'file' | 'directory'
  uniqueId: string
  mtime: string
  parentId?: string
  children?: string[]
}

export interface WatcherEvents {
  'file-changed': (uniqueId: string) => void
  'directory-content-changed': (uniqueId: string) => void
  'file-removed': (uniqueId: string) => void
}

class KnowledgeWatchService {
  private static instance: KnowledgeWatchService
  private readonly knowledgeWatcher: FSWatcher
  private readonly fileMap = new Map<string, FileInfo>()
  private readonly originalMtimeMap = new Map<string, string>()

  private constructor() {
    this.knowledgeWatcher = chokidar.watch([], {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    })

    this.setupWatcherEvents()
  }

  public static getInstance(): KnowledgeWatchService {
    if (!KnowledgeWatchService.instance) {
      KnowledgeWatchService.instance = new KnowledgeWatchService()
    }
    return KnowledgeWatchService.instance
  }

  private setupWatcherEvents(): void {
    this.knowledgeWatcher
      .on('add', (path) => this.handleFileChange(path))
      .on('change', (path) => this.handleFileChange(path))
      .on('unlink', (path) => this.handleFileRemoval(path))
      .on('unlinkDir', (path) => this.handleDirectoryRemoval(path))
  }

  private async handleFileChange(filePath: string): Promise<void> {
    try {
      const mainWindow = windowService.getMainWindow()
      const fileInfo = this.fileMap.get(filePath)
      console.log('[KnowledgeWatchService] handleFileChange', this.fileMap)

      if (!fileInfo || !mainWindow) return

      const currentMtime = fs.statSync(filePath).mtime.toISOString()

      if (fileInfo.mtime !== currentMtime) {
        console.warn('[KnowledgeWatchService] File changed:', filePath)
        this.updateFileInfo(filePath, { ...fileInfo, mtime: currentMtime })
      }
      if (!this.originalMtimeMap.has(filePath)) {
        this.originalMtimeMap.set(filePath, currentMtime)
      }
    } catch (error) {
      console.debug('[KnowledgeWatchService] Error handling file change:', error)
    }
  }

  private handleFileRemoval(filePath: string): void {
    try {
      const fileInfo = this.fileMap.get(filePath)
      if (!fileInfo) return

      this.updateParentOnRemoval(fileInfo)
      this.fileMap.delete(filePath)
      this.notifyFileRemoval(fileInfo)
    } catch (error) {
      console.debug('[KnowledgeWatchService] Error handling file removal:', error)
    }
  }

  private handleDirectoryRemoval(dirPath: string): void {
    try {
      const dirInfo = this.fileMap.get(dirPath)
      if (!dirInfo) return

      this.recursivelyRemoveChildren(dirPath)
      this.updateParentOnRemoval(dirInfo)
      this.fileMap.delete(dirPath)
      this.originalMtimeMap.delete(dirPath)
      console.log('6. [KnowledgeWatchService] recursivelyRemoveChildren', this.originalMtimeMap, this.fileMap)

      this.notifyDirectoryRemoval(dirInfo)
    } catch (error) {
      console.debug('[KnowledgeWatchService] Error handling directory removal:', error)
    }
  }

  public addFile(
    fileType: 'file' | 'directory',
    filePath: string,
    uniqueId: string,
    mtime: string,
    parentId?: string
  ): void {
    try {
      this.knowledgeWatcher.add(filePath)

      const fileInfo: FileInfo = {
        fileType: fileType as 'file' | 'directory',
        uniqueId,
        mtime,
        parentId,
        children: fileType === 'directory' ? [] : undefined
      }

      this.fileMap.set(filePath, fileInfo)
      this.updateParentOnAdd(parentId, uniqueId)
    } catch (error) {
      console.debug('[KnowledgeWatchService] Error adding file:', error)
    }
  }

  public removeFile(uniqueId: string): void {
    try {
      const filePath = this.findPathByUniqueId(uniqueId)
      if (!filePath) return

      const fileInfo = this.fileMap.get(filePath)
      if (fileInfo?.fileType === 'directory') {
        this.recursivelyRemoveChildren(filePath)
      }

      this.knowledgeWatcher.unwatch(filePath)
      this.fileMap.delete(filePath)
    } catch (error) {
      console.debug('[KnowledgeWatchService] Error removing file:', error)
    }
  }
  private updateFileInfo(filePath: string, fileInfo: FileInfo): void {
    try {
      this.fileMap.set(filePath, fileInfo)
      if (!this.originalMtimeMap.has(filePath)) {
        console.log('[KnowledgeWatchService] no original mtime for', this.originalMtimeMap)
        this.originalMtimeMap.set(filePath, fileInfo.mtime)
        return
      }
      const originalMtime = this.originalMtimeMap.get(filePath)

      if (originalMtime !== fileInfo.mtime) {
        const mainWindow = windowService.getMainWindow()
        if (!mainWindow) return
        if (mainWindow) {
          if (fileInfo.parentId) {
            mainWindow.webContents.send('directory-content-changed', fileInfo.parentId)
            return
          }
          this.notifyFileChange(fileInfo)
          console.warn('[KnowledgeWatchService] notifyFileChange:', fileInfo.mtime, originalMtime)
        }
      }
    } catch (error) {
      console.debug('[KnowledgeWatchService] Error updating file info:', error)
    }
  }

  private updateParentOnAdd(parentId: string | undefined, childId: string): void {
    if (!parentId) return

    const parentEntry = this.findEntryByUniqueId(parentId)
    if (parentEntry) {
      const [parentPath, parentInfo] = parentEntry
      parentInfo.children = [...(parentInfo.children || []), childId]
      this.fileMap.set(parentPath, parentInfo)
    }
  }

  private updateParentOnRemoval(fileInfo: FileInfo): void {
    if (!fileInfo.parentId) return

    const parentEntry = this.findEntryByUniqueId(fileInfo.parentId)
    if (parentEntry) {
      const [parentPath, parentInfo] = parentEntry
      parentInfo.children = parentInfo.children?.filter((id) => id !== fileInfo.uniqueId)
      this.fileMap.set(parentPath, parentInfo)
    }
  }

  private findEntryByUniqueId(uniqueId: string): [string, FileInfo] | undefined {
    return Array.from(this.fileMap.entries()).find(([, info]) => info.uniqueId === uniqueId)
  }

  private findPathByUniqueId(uniqueId: string): string | undefined {
    return this.findEntryByUniqueId(uniqueId)?.[0]
  }

  private recursivelyRemoveChildren(parentPath: string): void {
    const parentInfo = this.fileMap.get(parentPath)
    if (!parentInfo?.children) return

    for (const childId of parentInfo.children) {
      const childEntry = this.findEntryByUniqueId(childId)
      if (childEntry) {
        const [childPath, childInfo] = childEntry
        if (childInfo.fileType === 'directory') {
          this.recursivelyRemoveChildren(childPath)
        }
        this.knowledgeWatcher.unwatch(childPath)
        this.fileMap.delete(childPath)
        this.originalMtimeMap.delete(childPath)
      }
    }
  }

  private notifyFileChange(fileInfo: FileInfo): void {
    const mainWindow = windowService.getMainWindow()
    if (!mainWindow) return
    if (fileInfo.parentId) {
      mainWindow.webContents.send('directory-content-changed', fileInfo.parentId)
      return
    }
    mainWindow.webContents.send('file-changed', fileInfo.uniqueId)
  }

  private notifyFileRemoval(fileInfo: FileInfo): void {
    const mainWindow = windowService.getMainWindow()
    if (!mainWindow) return
    if (fileInfo.parentId) {
      mainWindow.webContents.send('directory-content-changed', fileInfo.parentId)
      return
    }

    mainWindow.webContents.send('file-removed', fileInfo.uniqueId)
  }
  private notifyDirectoryRemoval(dirInfo: FileInfo) {
    const mainWindow = windowService.getMainWindow()
    if (!mainWindow) return
    mainWindow.webContents.send('directory-removed', dirInfo.uniqueId)
  }

  public loadWatchItems(items: WatchItem[]): void {
    const allPaths = Array.from(this.fileMap.keys())
    this.knowledgeWatcher.unwatch(allPaths)
    this.fileMap.clear()
    this.originalMtimeMap.clear()
    const loadItem = (item: WatchItem, parentId?: string) => {
      try {
        this.knowledgeWatcher.add(item.path)
        this.originalMtimeMap.set(item.path, item.mtime)

        this.fileMap.set(item.path, {
          fileType: item.type,
          uniqueId: item.uniqueId,
          mtime: item.mtime,
          parentId,
          children: item.type === 'directory' ? item.children?.map((child) => child.uniqueId) : undefined
        })

        // 递归加载子项
        if (item.children) {
          item.children.forEach((child) => loadItem(child, item.uniqueId))
        }
      } catch (error) {
        console.debug('[KnowledgeWatchService] Error loading watch item:', error)
      }
    }

    items.forEach((item) => loadItem(item))
    console.log('2. [KnowledgeWatchService] Loaded watch items:', this.fileMap)
  }

  public getWatchItems(): WatchItem[] {
    try {
      const buildWatchItem = (filePath: string): WatchItem | null => {
        const fileInfo = this.fileMap.get(filePath)
        if (!fileInfo) return null

        const watchItem: WatchItem = {
          type: fileInfo.fileType,
          uniqueId: fileInfo.uniqueId,
          path: filePath,
          mtime: fileInfo.mtime
        }

        // 构建子项
        if (fileInfo.children && fileInfo.children.length > 0) {
          watchItem.children = fileInfo.children
            .map((childId) => {
              const childEntry = this.findEntryByUniqueId(childId)
              return childEntry ? buildWatchItem(childEntry[0]) : null
            })
            .filter((child): child is WatchItem => child !== null)
        }

        return watchItem
      }

      // 只返回根级别的项目
      const rootItems = Array.from(this.fileMap.entries())
        .filter(([, info]) => !info.parentId)
        .map(([filePath]) => buildWatchItem(filePath))
        .filter((item): item is WatchItem => item !== null)

      return rootItems
    } catch (error) {
      console.debug('[KnowledgeWatchService] Error getting watch items:', error)
      return []
    }
  }

  public async checkAllFiles(): Promise<void> {
    console.warn('3. [KnowledgeWatchService] Checking all files...')
    const mainWindow = windowService.getMainWindow()
    if (!mainWindow) {
      return
    }
    for (const [filePath, fileInfo] of this.fileMap.entries()) {
      try {
        await this.checkPath(filePath, fileInfo, mainWindow)
      } catch (error) {
        console.debug('[KnowledgeWatchService] Error checking file:', error)
      }
    }

    for (const [filePath, fileInfo] of this.fileMap.entries()) {
      this.originalMtimeMap.set(filePath, fileInfo.mtime)
    }
    console.log('4. [KnowledgeWatchService] checkAllFiles originalMtimeMap', this.originalMtimeMap)
  }

  private async checkPath(path: string, fileInfo: FileInfo, mainWindow: Electron.BrowserWindow): Promise<void> {
    if (!fs.existsSync(path)) {
      this.fileMap.delete(path)
      this.originalMtimeMap.delete(path)
      console.log('5. [KnowledgeWatchService] Check Path:', path)
      if (fileInfo.fileType === 'directory') {
        mainWindow.webContents.send('directory-removed', fileInfo.uniqueId)
      } else if (fileInfo.fileType === 'file') {
        mainWindow.webContents.send('file-removed', fileInfo.uniqueId)
      }
      return
    }

    const stats = await fs.promises.stat(path)
    if (fileInfo.fileType === 'file' && stats.isFile()) {
      await this.checkFileChanges(path, stats)
    } else if (fileInfo.fileType === 'directory' && stats.isDirectory()) {
      this.checkDirectoryChanges(path, fileInfo, mainWindow, stats)
    }
  }

  private async checkFileChanges(filePath: string, stats: fs.Stats): Promise<void> {
    const currentMtime = stats.mtime.toISOString()
    const originalMtime = this.originalMtimeMap.get(filePath)
    if (originalMtime && originalMtime !== currentMtime) {
      console.log('5. [KnowledgeWatchService] checkFileChanges File changed:', filePath)
      await this.handleFileChange(filePath)
    }
  }

  private checkDirectoryChanges(
    dirPath: string,
    dirInfo: FileInfo,
    mainWindow: Electron.BrowserWindow,
    stats: fs.Stats
  ): void {
    const currentMtime = stats.mtime.toISOString()
    const originalMtime = this.originalMtimeMap.get(dirPath)
    if (originalMtime && originalMtime !== currentMtime) {
      console.log('5. [KnowledgeWatchService] Directory changed:', dirPath)
      mainWindow.webContents.send('directory-content-changed', dirInfo.uniqueId)
    }
  }
}

export const knowledgeWatchService = KnowledgeWatchService.getInstance()
