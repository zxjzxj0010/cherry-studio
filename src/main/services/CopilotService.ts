import path from 'node:path'

import axios from 'axios'
import { app } from 'electron'
import fs from 'fs'

class CopilotService {
  public getAuthMessage = async (): Promise<{ device_code: string; user_code: string; verification_uri: string }> => {
    const { device_code, user_code, verification_uri } = await axios
      .post(
        'https://github.com/login/device/code',
        {
          client_id: 'Iv1.b507a08c87ecfe98',
          scope: 'read:user'
        },
        {
          headers: {
            accept: 'application/json',
            'editor-version': 'Neovim/0.6.1',
            'editor-plugin-version': 'copilot.vim/1.16.0',
            'content-type': 'application/json',
            'user-agent': 'GithubCopilot/1.155.0',
            'accept-encoding': 'gzip,deflate,br'
          }
        }
      )
      .then((resp) => resp.data)
    console.log({ device_code, user_code, verification_uri })
    return { device_code, user_code, verification_uri }
  }

  public getCopilotToken = async (
    _: Electron.IpcMainInvokeEvent,
    device_code: string
  ): Promise<{ access_token: string }> => {
    const maxAttempts = 12 // 1 minute total (5s * 12)
    let attempts = 0

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000))
      try {
        const resp = await axios.post(
          'https://github.com/login/oauth/access_token',
          {
            client_id: 'Iv1.b507a08c87ecfe98',
            device_code: device_code,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          },
          {
            headers: {
              accept: 'application/json',
              'editor-version': 'Neovim/0.6.1',
              'editor-plugin-version': 'copilot.vim/1.16.0',
              'content-type': 'application/json',
              'user-agent': 'GithubCopilot/1.155.0',
              'accept-encoding': 'gzip,deflate,br'
            }
          }
        )
        const access_token = resp.data.access_token
        if (access_token) {
          return { access_token }
        }
      } catch (error) {
        if (attempts === maxAttempts - 1) {
          throw new Error('Failed to get access token after multiple attempts')
        }
      }
      attempts++
    }
    throw new Error('Timeout waiting for access token')
  }

  public saveCopilotToken = async (_: Electron.IpcMainInvokeEvent, token: string): Promise<void> => {
    const copilotTokenPath = path.join(app.getPath('userData'), '.copilot_token')
    await fs.promises.writeFile(copilotTokenPath, token)
  }
  public getToken = async (): Promise<{ token: string }> => {
    const copilotTokenPath = path.join(app.getPath('userData'), '.copilot_token')
    try {
      const access_token = await fs.promises.readFile(copilotTokenPath, 'utf-8')
      const response = await axios.get('https://api.github.com/copilot_internal/v2/token', {
        headers: {
          authorization: `token ${access_token}`,
          'editor-version': 'Neovim/0.6.1',
          'editor-plugin-version': 'copilot.vim/1.16.0',
          'user-agent': 'GithubCopilot/1.155.0'
        }
      })
      const token = response.data.token
      return { token }
    } catch (e) {
      throw new Error('Failed to get access token')
    }
  }
}
export default new CopilotService()
