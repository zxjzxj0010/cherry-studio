import KnowledgeWatchService from '@main/services/KnowledgeWatchService'
import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

export type WatchItem = {
  uniqueId: string
  path: string
  hash: string
}

export type KnowledgeWatchList = {
  watchItems: WatchItem[]
}

/**
 * 初始化 watcher.json 文件（如果不存在）并返回数据
 */
export async function initWatcher(): Promise<KnowledgeWatchList | null> {
  const storageDir = path.join(app.getPath('userData'), 'Data', 'Files')
  const knowledgeWatcherFile = path.join(storageDir, 'KnowledgeWatcher.json')
  if (!fs.existsSync(knowledgeWatcherFile)) {
    fs.writeFileSync(knowledgeWatcherFile, JSON.stringify({ watchItems: [] }, null, 2))
    return { watchItems: [] }
  }
  return JSON.parse(fs.readFileSync(knowledgeWatcherFile, 'utf-8')) as KnowledgeWatchList
}

/**
 * 加载已保存的 watcher 数据，同时添加监听
 */
export async function loadWatcher(): Promise<void> {
  const knowledgeWatchList = await initWatcher()
  if (!knowledgeWatchList || !knowledgeWatchList.watchItems) return
  const watchService = KnowledgeWatchService.getInstance()
  watchService.loadWatchItems(knowledgeWatchList.watchItems)
}

/**
 * 保存当前 watcher 数据到 watcher.json
 */
export async function saveWatcher(): Promise<void> {
  const watchService = KnowledgeWatchService.getInstance()
  const watchItems = watchService.getWatchItems()
  console.log('Saving watcher:', watchItems)
  const storageDir = path.join(app.getPath('userData'), 'Data', 'Files')
  const knowledgeWatcherFile = path.join(storageDir, 'KnowledgeWatcher.json')
  fs.writeFileSync(knowledgeWatcherFile, JSON.stringify({ watchItems }, null, 2))
}
