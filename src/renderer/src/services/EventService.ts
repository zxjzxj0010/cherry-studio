import Emittery from 'emittery'

export const EventEmitter = new Emittery()

export const EVENT_NAMES = {
  SEND_MESSAGE: 'SEND_MESSAGE',
  // APPEND_MESSAGE: 'APPEND_MESSAGE',
  RECEIVE_MESSAGE: 'RECEIVE_MESSAGE',
  AI_AUTO_RENAME: 'AI_AUTO_RENAME',
  CLEAR_MESSAGES: 'CLEAR_MESSAGES',
  ADD_ASSISTANT: 'ADD_ASSISTANT',
  EDIT_MESSAGE: 'EDIT_MESSAGE',
  REGENERATE_MESSAGE: 'REGENERATE_MESSAGE',
  CHAT_COMPLETION_PAUSED: 'CHAT_COMPLETION_PAUSED',
  ESTIMATED_TOKEN_COUNT: 'ESTIMATED_TOKEN_COUNT',
  SHOW_ASSISTANTS: 'SHOW_ASSISTANTS',
  SHOW_CHAT_SETTINGS: 'SHOW_CHAT_SETTINGS',
  SHOW_TOPIC_SIDEBAR: 'SHOW_TOPIC_SIDEBAR',
  SWITCH_TOPIC_SIDEBAR: 'SWITCH_TOPIC_SIDEBAR',
  NEW_CONTEXT: 'NEW_CONTEXT',
  NEW_BRANCH: 'NEW_BRANCH',
  COPY_TOPIC_IMAGE: 'COPY_TOPIC_IMAGE',
  EXPORT_TOPIC_IMAGE: 'EXPORT_TOPIC_IMAGE',
  LOCATE_MESSAGE: 'LOCATE_MESSAGE',
  ADD_NEW_TOPIC: 'ADD_NEW_TOPIC',
  RESEND_MESSAGE: 'RESEND_MESSAGE',
  SHOW_MODEL_SELECTOR: 'SHOW_MODEL_SELECTOR',
  QUOTE_TEXT: 'QUOTE_TEXT'
}
