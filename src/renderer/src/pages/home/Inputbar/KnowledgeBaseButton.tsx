import { CheckOutlined, FileSearchOutlined } from '@ant-design/icons'
import { useAppSelector } from '@renderer/store'
import { KnowledgeBase } from '@renderer/types'
import { Popover, Select, SelectProps, Tooltip } from 'antd'
import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

interface Props {
  selectedBases?: KnowledgeBase[]
  onSelect: (bases?: KnowledgeBase[]) => void
  disabled?: boolean
  ToolbarButton?: any
}

const KnowledgeBaseSelector: FC<Props> = ({ selectedBases, onSelect }) => {
  const { t } = useTranslation()
  const knowledgeState = useAppSelector((state) => state.knowledge)
  const knowledgeOptions: SelectProps['options'] = []

  knowledgeState.bases.forEach((base) => {
    knowledgeOptions.push({
      label: base.name,
      value: base.id
    })
  })

  return (
    <SelectorContainer>
      {knowledgeState.bases.length === 0 ? (
        <EmptyMessage>{t('knowledge.no_bases')}</EmptyMessage>
      ) : (
        <>
          {/* {selectedBases && ( */}
          {/*   <Button type="link" block onClick={() => onSelect([])} style={{ textAlign: 'left' }}> */}
          {/*     {t('knowledge.clear_selection')} */}
          {/*   </Button> */}
          {/* )} */}
          <Select
            mode="multiple"
            defaultValue={selectedBases?.map((base) => base.id)}
            allowClear
            placeholder={t('agents.add.knowledge_base.placeholder')}
            menuItemSelectedIcon={<CheckOutlined />}
            options={knowledgeOptions}
            onChange={(value) => onSelect(knowledgeState.bases.filter((b) => value.includes(b.id)))}
            style={{ width: '100px' }}
          />

          {/* {knowledgeState.bases.map((base) => ( */}
          {/*   <Button */}
          {/*     key={base.id} */}
          {/*     type={selectedBase?.id === base.id ? 'primary' : 'text'} */}
          {/*     block */}
          {/*     onClick={() => onSelect(base)} */}
          {/*     style={{ textAlign: 'left' }}> */}
          {/*     {base.name} */}
          {/*   </Button> */}
          {/* ))} */}
        </>
      )}
    </SelectorContainer>
  )
}

const KnowledgeBaseButton: FC<Props> = ({ selectedBases, onSelect, disabled, ToolbarButton }) => {
  const { t } = useTranslation()

  // if (selectedBases && selectedBases?.length > 0) {
  //   return (
  //     <Tooltip placement="top" title={selectedBases[0].name} arrow>
  //       <ToolbarButton type="text" onClick={() => onSelect([])}>
  //         <FileSearchOutlined style={{ color: selectedBases[0] ? 'var(--color-link)' : 'var(--color-icon)' }} />
  //       </ToolbarButton>
  //     </Tooltip>
  //   )
  // }

  return (
    <Tooltip placement="top" title={t('chat.input.knowledge_base')} arrow>
      <Popover
        placement="top"
        content={<KnowledgeBaseSelector selectedBases={selectedBases} onSelect={onSelect} />}
        overlayStyle={{ maxWidth: 400 }}
        trigger="click">
        <ToolbarButton type="text" onClick={() => selectedBases} disabled={disabled}>
          <FileSearchOutlined style={{ color: selectedBases ? 'var(--color-link)' : 'var(--color-icon)' }} />
        </ToolbarButton>
      </Popover>
    </Tooltip>
  )
}

const SelectorContainer = styled.div`
  max-height: 300px;
  overflow-y: auto;
`

const EmptyMessage = styled.div`
  padding: 8px;
`

export default KnowledgeBaseButton
