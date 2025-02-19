import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
export async function InitWatcher() {
  const storageDir = path.join(app.getPath('userData'), 'Data', 'Files')
  const knowledgeWatcherFile = path.join(storageDir, 'KnowledgeWatcher.json')
  if (fs.existsSync(knowledgeWatcherFile)) {
    return
  }
  fs.writeFileSync(knowledgeWatcherFile, JSON.stringify({}))
}

export async function LoadWatcher() {
  InitWatcher()
}
