import * as fs from 'node:fs'

import { LocalPathLoader, RAGApplication, TextLoader } from '@llm-tools/embedjs'
import type { AddLoaderReturn } from '@llm-tools/embedjs-interfaces'
import { FileType, KnowledgeBaseParams } from '@types'

import { OdLoader, OdType } from './odLoader'

// embedjs内置loader类型
const commonExts = ['.pdf', '.csv', '.json', '.docx', '.pptx', '.xlsx', '.md', '.jpeg']

export async function addOdLoader(
  ragApplication: RAGApplication,
  file: FileType,
  base: KnowledgeBaseParams,
  forceReload: boolean
): Promise<AddLoaderReturn> {
  const loaderMap: Record<string, OdType> = {
    '.odt': OdType.OdtLoader,
    '.ods': OdType.OdsLoader,
    '.odp': OdType.OdpLoader
  }
  const odType = loaderMap[file.ext]
  if (!odType) {
    throw new Error('Unknown odType')
  }
  return ragApplication.addLoader(
    new OdLoader({
      odType,
      filePath: file.path,
      chunkSize: base.chunkSize,
      chunkOverlap: base.chunkOverlap
    }) as any,
    forceReload
  )
}

export async function addFileLoader(
  ragApplication: RAGApplication,
  file: FileType,
  base: KnowledgeBaseParams,
  forceReload: boolean
): Promise<AddLoaderReturn> {
  // 内置类型
  if (commonExts.includes(file.ext)) {
    const result = await ragApplication.addLoader(
      new LocalPathLoader({ path: file.path, chunkSize: base.chunkSize, chunkOverlap: base.chunkOverlap }) as any,
      forceReload
    )
    return result
  }

  // 自定义类型
  if (['.odt', '.ods', '.odp'].includes(file.ext)) {
    return await addOdLoader(ragApplication, file, base, forceReload)
  }

  // 文本类型
  const fileContent = fs.readFileSync(file.path, 'utf-8')

  return await ragApplication.addLoader(
    new TextLoader({ text: fileContent, chunkSize: base.chunkSize, chunkOverlap: base.chunkOverlap }) as any,
    forceReload
  )
}
