import hotkeys from 'hotkeys-js'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const NavigationHandler: React.FC = () => {
  const navigate = useNavigate()

  useEffect(() => {
    hotkeys('command+,, ctrl+,', function () {
      console.log('show_settings')
      navigate('/settings/provider')
    })

    return () => {
      hotkeys.unbind('command+,, ctrl+,')
    }
  }, [navigate])

  return null
}

export default NavigationHandler
