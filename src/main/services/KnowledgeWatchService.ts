import chokidar, { FSWatcher } from 'chokidar'
class KnowledgeWatchService {
  private knowledgeWatcher: FSWatcher
  constructor() {
    this.knowledgeWatcher = chokidar.watch('file', {
      persistent: true
    })
    this.knowledgeWatcher
      .on('add', (path) => console.log(`File ${path} has been added`))
      .on('change', (path) => console.log(`File ${path} has been changed`))
      .on('unlink', (path) => console.log(`File ${path} has been removed`))
  }
  public getKnowledgeWatcher = () => {
    return this.knowledgeWatcher
  }
}
export default KnowledgeWatchService
