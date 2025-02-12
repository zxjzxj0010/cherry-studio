import * as fs from 'node:fs'
import path from 'node:path'

import { RAGApplication, RAGApplicationBuilder, TextLoader } from '@llm-tools/embedjs'
import type { AddLoaderReturn, ExtractChunkData } from '@llm-tools/embedjs-interfaces'
import { LibSqlDb } from '@llm-tools/embedjs-libsql'
import { SitemapLoader } from '@llm-tools/embedjs-loader-sitemap'
import { WebLoader } from '@llm-tools/embedjs-loader-web'
import { AzureOpenAiEmbeddings, OpenAiEmbeddings } from '@llm-tools/embedjs-openai'
import { addFileLoader } from '@main/loader'
import { getInstanceName } from '@main/utils'
import { getAllFiles } from '@main/utils/file'
import { FileType, KnowledgeBaseParams, KnowledgeItem } from '@types'
import { app } from 'electron'
import { v4 as uuidv4 } from 'uuid'

class KnowledgeService {
  private storageDir = path.join(app.getPath('userData'), 'Data', 'KnowledgeBase')

  constructor() {
    this.initStorageDir()
  }

  private initStorageDir = (): void => {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true })
    }
  }

  private getRagApplication = async ({
    id,
    model,
    apiKey,
    apiVersion,
    baseURL,
    dimensions
  }: KnowledgeBaseParams): Promise<RAGApplication> => {
    const batchSize = 10
    return new RAGApplicationBuilder()
      .setModel('NO_MODEL')
      .setEmbeddingModel(
        apiVersion
          ? new AzureOpenAiEmbeddings({
            azureOpenAIApiKey: apiKey,
            azureOpenAIApiVersion: apiVersion,
            azureOpenAIApiDeploymentName: model,
            azureOpenAIApiInstanceName: getInstanceName(baseURL),
            dimensions,
            batchSize
          })
          : new OpenAiEmbeddings({
            model,
            apiKey,
            configuration: { baseURL },
            dimensions,
            batchSize
          })
      )
      .setVectorDatabase(new LibSqlDb({ path: path.join(this.storageDir, id) }))
      .build()
  }

  public create = async (_: Electron.IpcMainInvokeEvent, base: KnowledgeBaseParams): Promise<void> => {
    this.getRagApplication(base)
  }

  public reset = async (_: Electron.IpcMainInvokeEvent, { base }: { base: KnowledgeBaseParams }): Promise<void> => {
    const ragApplication = await this.getRagApplication(base)
    await ragApplication.reset()
  }

  public delete = async (_: Electron.IpcMainInvokeEvent, id: string): Promise<void> => {
    const dbPath = path.join(this.storageDir, id)
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath, { recursive: true })
    }
  }

  public add = async (
    _: Electron.IpcMainInvokeEvent,
    { base, item, forceReload = false }: { base: KnowledgeBaseParams; item: KnowledgeItem; forceReload: boolean }
  ): Promise<AddLoaderReturn> => {
    const ragApplication = await this.getRagApplication(base)

    if (item.type === 'directory') {
      const directory = item.content as string
      const files = getAllFiles(directory)
      const loaderPromises = files.map((file) => addFileLoader(ragApplication, file, base, forceReload))
      await Promise.all(loaderPromises)
      return { entriesAdded: 0, uniqueId: `DirectoryLoader_${uuidv4()}`, loaderType: 'DirectoryLoader' }
    }

    if (item.type === 'url') {
      const content = item.content as string
      if (content.startsWith('http')) {
        return await ragApplication.addLoader(
          new WebLoader({ urlOrContent: content, chunkSize: base.chunkSize, chunkOverlap: base.chunkOverlap }) as any,
          forceReload
        )
      }
    }

    if (item.type === 'sitemap') {
      const content = item.content as string
      // @ts-ignore loader type
      return await ragApplication.addLoader(
        new SitemapLoader({ url: content, chunkSize: base.chunkSize, chunkOverlap: base.chunkOverlap }) as any,
        forceReload
      )
    }

    if (item.type === 'note') {
      const content = item.content as string
      console.debug('chunkSize', base.chunkSize)
      return await ragApplication.addLoader(
        new TextLoader({ text: content, chunkSize: base.chunkSize, chunkOverlap: base.chunkOverlap }),
        forceReload
      )
    }

    if (item.type === 'file') {
      const file = item.content as FileType

      return await addFileLoader(ragApplication, file, base, forceReload)
    }

    return { entriesAdded: 0, uniqueId: '', loaderType: '' }
  }

  public remove = async (
    _: Electron.IpcMainInvokeEvent,
    { uniqueId, base }: { uniqueId: string; base: KnowledgeBaseParams }
  ): Promise<void> => {
    const ragApplication = await this.getRagApplication(base)
    await ragApplication.deleteLoader(uniqueId)
  }

  public search = async (
    _: Electron.IpcMainInvokeEvent,
    { search, base }: { search: string; base: KnowledgeBaseParams }
  ): Promise<ExtractChunkData[]> => {
    const ragApplication = await this.getRagApplication(base)
    return await ragApplication.search(search)
  }
}

export default new KnowledgeService()
