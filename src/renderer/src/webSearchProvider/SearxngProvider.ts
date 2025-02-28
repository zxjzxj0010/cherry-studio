import { SearxngClient } from '@agentic/searxng'
import { WebSearchProvider, WebSearchResponse } from '@renderer/types'
import axios from 'axios'

import BaseWebSearchProvider from './BaseWebSearchProvider'
export default class SearxngProvider extends BaseWebSearchProvider {
  private searxng: SearxngClient
  constructor(provider: WebSearchProvider) {
    super(provider)
    this.searxng = new SearxngClient({ apiBaseUrl: 'http://0.0.0.0:8080' })
  }
  public async search(query: string, maxResults: number): Promise<WebSearchResponse> {
    const result = await this.searxng.search({
      query: query,
      engines: ['google', 'bing', 'duckduckgo'],
      language: 'auto'
    })
    return {
      query: result.query,
      results: result.results.slice(0, maxResults).map((result) => {
        return {
          title: result.title,
          content: result.content || '',
          url: result.url
        }
      })
    }
  }
  public async engines() {
    const response = await axios
      .get('http://0.0.0.0:8080/config')
      .then((res) => {
        return res.data
      })
      .catch((err) => {
        console.log(err)
      })
    const engines = response.engines
      .filter(
        (engine: { enabled: boolean; categories: string[]; name: string }) =>
          engine.enabled &&
          Array.isArray(engine.categories) &&
          engine.categories.includes('general') &&
          engine.categories.includes('web')
      )
      .map((engine) => engine.name)
    console.log(engines)
  }
}
