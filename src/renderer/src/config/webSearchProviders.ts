import SearxngLogo from '@renderer/assets/images/search/searxng.svg'
import TavilyLogo from '@renderer/assets/images/search/tavily.png'
import TavilyLogoDark from '@renderer/assets/images/search/tavily-dark.svg'
export function getWebSearchProviderLogo(providerId: string) {
  switch (providerId) {
    case 'tavily':
      return TavilyLogo
    case 'tavily-dark':
      return TavilyLogoDark
    case 'searxng':
      return SearxngLogo

    default:
      return undefined
  }
}
