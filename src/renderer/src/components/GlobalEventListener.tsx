import { addPendingChange } from '@renderer/store/knowledgeFile'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'

const GlobalEventListener: React.FC = () => {
  const dispatch = useDispatch()

  useEffect(() => {
    const directoryCleanup = window.electron.ipcRenderer.on('directory-content-changed', (_, uniqueId: string) => {
      console.log('directory-content-changed', uniqueId)
      dispatch(
        addPendingChange({
          type: 'directory-changed',
          uniqueId
        })
      )
    })

    const fileCleanup = window.electron.ipcRenderer.on('file-changed', (_, uniqueId: string) => {
      console.log('file-changed', uniqueId)
      dispatch(
        addPendingChange({
          type: 'file-changed',
          uniqueId
        })
      )
    })

    return () => {
      directoryCleanup()
      fileCleanup()
    }
  }, [dispatch])

  return null
}

export default GlobalEventListener
