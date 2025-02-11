import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { BaseLoader } from '@llm-tools/embedjs-interfaces'
import { cleanString } from '@llm-tools/embedjs-utils'
import md5 from 'md5'
import { OfficeParserConfig, parseOfficeAsync } from 'officeparser'

export class OdsLoader extends BaseLoader<{ type: 'OdsLoader' }> {
  private readonly filePath: string
  private extractedText: string
  private config: OfficeParserConfig

  constructor({ filePath, chunkSize, chunkOverlap }: { filePath: string; chunkSize?: number; chunkOverlap?: number }) {
    super(`OdsLoader_${md5(filePath)}`, { filePath }, chunkSize ?? 1000, chunkOverlap ?? 0)
    this.filePath = filePath
    this.extractedText = ''
    this.config = {
      newlineDelimiter: ' ',
      ignoreNotes: false
    }
  }

  private async extractTextFromOdt() {
    try {
      this.extractedText = await parseOfficeAsync(this.filePath, this.config)
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  override async *getUnfilteredChunks() {
    if (!this.extractedText) {
      await this.extractTextFromOdt()
    }
    const chunker = new RecursiveCharacterTextSplitter({
      chunkSize: this.chunkSize,
      chunkOverlap: this.chunkOverlap
    })
    console.warn('ods extractedText', this.extractedText)
    console.warn('cleanString', cleanString(this.extractedText))

    const chunks = await chunker.splitText(cleanString(this.extractedText))

    console.warn('chunks', chunks.length)
    console.warn('text', chunks[0])

    for (const chunk of chunks) {
      yield {
        pageContent: chunk,
        metadata: {
          type: 'OdsLoader' as const,
          source: this.filePath
        }
      }
    }
  }
}
