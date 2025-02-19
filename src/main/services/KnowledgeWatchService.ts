import { WatchItem } from '@main/utils/watcher'
import chokidar, { FSWatcher } from 'chokidar'

class KnowledgeWatchService {
  private static instance: KnowledgeWatchService
  private knowledgeWatcher: FSWatcher
  // 内部映射，key 为文件路径，value 为 { uniqueId, hash }
  private fileMap: Map<string, { uniqueId: string; hash: string }> = new Map()

  private constructor() {
    // 初始化时先不监听任何文件，由后续 addFile 控制
    this.knowledgeWatcher = chokidar.watch([], { persistent: true })

    this.knowledgeWatcher
      .on('add', (filePath) => console.log(`File ${filePath} has been added`))
      .on('change', (filePath) => console.log(`File ${filePath} has been changed`))
      .on('unlink', (filePath) => {
        console.log(`File ${filePath} has been removed`)
        this.fileMap.delete(filePath)
      })
  }

  public static getInstance(): KnowledgeWatchService {
    if (!KnowledgeWatchService.instance) {
      KnowledgeWatchService.instance = new KnowledgeWatchService()
    }
    return KnowledgeWatchService.instance
  }

  public getKnowledgeWatcher(): FSWatcher {
    return this.knowledgeWatcher
  }

  /**
   * 添加文件，同时保存 uniqueId 与 hash 信息
   */
  public addFile(filePath: string, uniqueId: string, hash: string): void {
    this.knowledgeWatcher.add(filePath)
    this.fileMap.set(filePath, { uniqueId, hash })
  }

  /**
   * 加载已有的 watchItems 到内部，同时添加监听
   */
  public loadWatchItems(items: WatchItem[]): void {
    for (const item of items) {
      this.knowledgeWatcher.add(item.path)
      this.fileMap.set(item.path, { uniqueId: item.uniqueId, hash: item.hash })
      console.log(`Loaded watcher for ${item.path}`)
    }
  }

  /**
   * 返回所有 watchItem 数据
   */
  public getWatchItems(): WatchItem[] {
    const items: WatchItem[] = []
    for (const [filePath, { uniqueId, hash }] of this.fileMap.entries()) {
      items.push({ uniqueId, path: filePath, hash })
    }
    return items
  }
}

export default KnowledgeWatchService
