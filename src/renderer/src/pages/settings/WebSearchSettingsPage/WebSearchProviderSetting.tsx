import { WebSearchProvider } from '@renderer/types'
import { FC } from 'react'

import { SettingContainer, SettingTitle } from '..'

interface Props {
  provider: WebSearchProvider
}
const WebSearchProviderSetting: FC<Props> = ({ provider: _provider }) => {
  return (
    <SettingContainer>
      <SettingTitle>hi</SettingTitle>
    </SettingContainer>
  )
}

export default WebSearchProviderSetting
