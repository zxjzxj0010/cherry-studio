import { WebSearchProvider } from '@renderer/types'

import BaseWebSearchProvider from './BaseWebSearchProvider'
import SearxngProvider from './SearxngProvider'

export default class WebSearchProviderFactory {
  static create(provider: WebSearchProvider): BaseWebSearchProvider {
    switch (provider.id) {
      case 'tavily':
        return new SearxngProvider(provider)
      case 'searxng':
        return new SearxngProvider(provider)
      default:
        return new SearxngProvider(provider)
    }
  }
}
