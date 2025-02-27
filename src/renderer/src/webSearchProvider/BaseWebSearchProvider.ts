import { WebSearchProvider } from '@renderer/types'

export default abstract class BaseWebSearchProvider {
  private provider: WebSearchProvider
  constructor(provider: WebSearchProvider) {
    this.provider = provider
  }
}
