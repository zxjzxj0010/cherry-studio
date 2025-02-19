import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const NavigationHandler: React.FC = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const handleOpenSettings = () => {
      navigate('/settings/provider')
    }

    window.electron.ipcRenderer.on('open-settings', handleOpenSettings)

    return () => {
      window.electron.ipcRenderer.removeListener('open-settings', handleOpenSettings)
    }
  }, [navigate])

  return null
}

export default NavigationHandler
