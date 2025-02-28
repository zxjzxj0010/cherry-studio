import { TavilyClient } from '@agentic/tavily'
import { WebSearchProvider, WebSearchResponse } from '@renderer/types'

import BaseWebSearchProvider from './BaseWebSearchProvider'

export default class TavilyProvider extends BaseWebSearchProvider {
  private tvly: TavilyClient
  constructor(provider: WebSearchProvider) {
    super(provider)
    this.tvly = new TavilyClient({ apiKey: provider.apiKey })
  }
  public async search(query: string, maxResults: number, excludeDomains: string[]): Promise<WebSearchResponse> {
    const result = await this.tvly.search({ query, max_results: maxResults, exclude_domains: excludeDomains })
    return {
      query: result.query,
      results: result.results.map((result) => {
        return {
          title: result.title,
          content: result.content || '',
          url: result.url
        }
      })
    }
  }
}
