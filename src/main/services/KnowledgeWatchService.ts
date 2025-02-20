import * as fs from 'node:fs'

import { WatchItem } from '@main/utils/watcher'
import chokidar, { FSWatcher } from 'chokidar'
import * as crypto from 'crypto'

import { windowService } from './WindowService'

class KnowledgeWatchService {
  private static instance: KnowledgeWatchService
  private knowledgeWatcher: FSWatcher

  // 用于app关闭时保存watcher / app开启时加载watcher
  private fileMap: Map<
    string,
    {
      fileType: string
      uniqueId: string
      hash: string
      parentId?: string
      children?: string[]
    }
  > = new Map()

  // 用于app打开时比较文件是否更改
  private originalHashMap = new Map<string, string>()

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

  private setupWatcherEvents() {
    this.knowledgeWatcher
      .on('add', (filePath) => {
        console.log(`File ${filePath} has been added`)
        this.handleFileChange(filePath)
      })
      .on('change', (filePath) => {
        console.log(`File ${filePath} has been changed`)
        this.handleFileChange(filePath)
      })
      .on('unlink', (filePath) => {
        const fileInfo = this.fileMap.get(filePath)
        if (fileInfo && fileInfo.parentId) {
          const parentInfo = Array.from(this.fileMap.entries()).find(([, info]) => info.uniqueId === fileInfo.parentId)
          if (parentInfo) {
            const [parentPath, parentData] = parentInfo
            parentData.children = parentData.children?.filter((id) => id !== fileInfo.uniqueId)
            this.fileMap.set(parentPath, parentData)
          }
        }
        this.fileMap.delete(filePath)
      })
      .on('unlinkDir', (dirPath) => {
        const dirInfo = this.fileMap.get(dirPath)
        if (!dirInfo) return

        // 递归删除所有子文件/目录的记录
        const deleteChildren = (parentPath: string) => {
          const parentInfo = this.fileMap.get(parentPath)
          if (!parentInfo?.children) return

          for (const childId of parentInfo.children) {
            const childEntry = Array.from(this.fileMap.entries()).find(([, info]) => info.uniqueId === childId)
            if (childEntry) {
              const [childPath, childInfo] = childEntry
              if (childInfo.children) {
                deleteChildren(childPath)
              }
              this.fileMap.delete(childPath)
            }
          }
        }

        // 删除该目录的所有子项
        deleteChildren(dirPath)

        // 更新父目录的 children 信息
        if (dirInfo.parentId) {
          const parentInfo = Array.from(this.fileMap.entries()).find(([, info]) => info.uniqueId === dirInfo.parentId)
          if (parentInfo) {
            const [parentPath, parentData] = parentInfo
            parentData.children = parentData.children?.filter((id) => id !== dirInfo.uniqueId)
            this.fileMap.set(parentPath, parentData)
          }
        }

        // 删除目录本身的记录
        this.fileMap.delete(dirPath)
      })
  }
  private async handleFileChange(filePath: string) {
    const mainWindow = windowService.getMainWindow()
    const fileInfo = this.fileMap.get(filePath)

    if (!fileInfo || !mainWindow) return

    const fileContent = await fs.promises.readFile(filePath, 'utf-8')
    const currentHash = crypto.createHash('sha256').update(fileContent).digest('hex')

    if (fileInfo.hash !== currentHash) {
      fileInfo.hash = currentHash
      this.fileMap.set(filePath, fileInfo)
      mainWindow.webContents.send('file-changed', fileInfo.uniqueId)

      // 如果是文件夹内的文件变化，也通知文件夹的变化
      if (fileInfo.parentId) {
        mainWindow.webContents.send('directory-content-changed', fileInfo.parentId)
      }
    }
  }

  public static getInstance(): KnowledgeWatchService {
    if (!KnowledgeWatchService.instance) {
      KnowledgeWatchService.instance = new KnowledgeWatchService()
    }
    return KnowledgeWatchService.instance
  }

  public addFile(fileType: string, filePath: string, uniqueId: string, hash: string, parentId?: string): void {
    this.knowledgeWatcher.add(filePath)
    this.fileMap.set(filePath, {
      fileType,
      uniqueId,
      hash,
      parentId,
      children: fileType === 'directory' ? [] : undefined
    })
    console.log(`Watching ${filePath}`)

    if (parentId) {
      const parentEntry = Array.from(this.fileMap.entries()).find(([, info]) => info.uniqueId === parentId)
      if (parentEntry) {
        const [parentPath, parentInfo] = parentEntry
        parentInfo.children = [...(parentInfo.children || []), uniqueId]
        this.fileMap.set(parentPath, parentInfo)
      }
    }
  }

  public removeFile(uniqueId: string) {
    const filePath = this.fileMap.entries().find(([, info]) => info.uniqueId === uniqueId)?.[0]
    if (!filePath) return

    const fileInfo = this.fileMap.get(filePath)
    if (fileInfo?.fileType === 'directory') {
      const unwatchChildren = (parentPath: string) => {
        const parentInfo = this.fileMap.get(parentPath)
        if (!parentInfo?.children) return

        for (const childId of parentInfo.children) {
          const childEntry = Array.from(this.fileMap.entries()).find(([, info]) => info.uniqueId === childId)
          if (childEntry) {
            const [childPath, childInfo] = childEntry
            if (childInfo.fileType === 'directory') {
              unwatchChildren(childPath)
            }
            this.knowledgeWatcher.unwatch(childPath)
            this.fileMap.delete(childPath)
            console.log(`Unwatching ${childPath}`)
          }
        }
      }
      unwatchChildren(filePath)
    }

    this.knowledgeWatcher.unwatch(filePath)
    this.fileMap.delete(filePath)
    console.log(`Unwatching ${filePath}`)
  }

  public loadWatchItems(items: WatchItem[]): void {
    const loadItem = (item: WatchItem, parentId?: string) => {
      this.knowledgeWatcher.add(item.path)
      this.originalHashMap.set(item.path, item.hash)

      this.fileMap.set(item.path, {
        fileType: item.type,
        uniqueId: item.uniqueId,
        hash: item.hash,
        parentId,
        children: item.type === 'directory' ? item.children?.map((child) => child.uniqueId) : undefined
      })

      if (item.children) {
        item.children.forEach((child) => loadItem(child, item.uniqueId))
      }
    }

    items.forEach((item) => loadItem(item))
  }

  public async checkAllFiles(): Promise<void> {
    const mainWindow = windowService.getMainWindow()
    if (!mainWindow) {
      console.log('No main window')
      return
    }

    for (const [filePath, fileInfo] of this.fileMap.entries()) {
      try {
        if (!fs.existsSync(filePath)) {
          this.fileMap.delete(filePath)
          this.originalHashMap.delete(filePath)
          console.log(`File ${filePath} has been removed`)
          mainWindow.webContents.send('file-removed', fileInfo.uniqueId)
          continue
        }

        const stats = await fs.promises.stat(filePath)
        if (!stats.isFile()) {
          continue
        }

        const fileContent = await fs.promises.readFile(filePath, 'utf-8')
        const currentHash = crypto.createHash('sha256').update(fileContent).digest('hex')
        const originalHash = this.originalHashMap.get(filePath)

        if (originalHash !== currentHash) {
          // 更新文件Map中的哈希值
          fileInfo.hash = currentHash
          this.fileMap.set(filePath, fileInfo)

          console.warn(`File ${filePath} has changed from initial state`)
          mainWindow.webContents.send('file-changed', fileInfo.uniqueId)

          if (fileInfo.parentId) {
            console.warn(`Directory ${fileInfo.parentId} content changed`)
            mainWindow.webContents.send('directory-content-changed', fileInfo.parentId)
          }
        }
      } catch (error) {
        console.error(`Error checking file ${filePath}:`, error)
      }
    }
    this.clearOriginalHashes()
  }

  // 在所有检查完成后，可以选择是否清理originalHashMap
  private clearOriginalHashes(): void {
    this.originalHashMap.clear()
  }

  public getWatchItems(): WatchItem[] {
    console.log('Getting watch items:', this.fileMap)
    const buildWatchItem = (filePath: string): WatchItem => {
      const fileInfo = this.fileMap.get(filePath)!
      const watchItem: WatchItem = {
        type: fileInfo.fileType as 'directory' | 'file',
        uniqueId: fileInfo.uniqueId,
        path: filePath,
        hash: fileInfo.hash
      }

      if (fileInfo.children && fileInfo.children.length > 0) {
        watchItem.children = fileInfo.children
          .map((childId) => {
            const childEntry = Array.from(this.fileMap.entries()).find(([, info]) => info.uniqueId === childId)
            return childEntry ? buildWatchItem(childEntry[0]) : null
          })
          .filter((child): child is WatchItem => child !== null)
      }

      return watchItem
    }

    const rootItems = Array.from(this.fileMap.entries())
      .filter(([, info]) => !info.parentId)
      .map(([filePath]) => buildWatchItem(filePath))

    return rootItems
  }
}

export const knowledgeWatchService = KnowledgeWatchService.getInstance()
