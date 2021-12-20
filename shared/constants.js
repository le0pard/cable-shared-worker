export const ACTIONCABLE_TYPE = 'actioncable'
export const ANYCABLE_TYPE = 'anycable'

export const PING_COMMAND = 'ping'
export const PONG_COMMAND = 'pong'
export const SUBSCRIBE_TO_CHANNEL = 'subscribeToChannel'
export const UNSUBSCRIBE_FROM_CHANNEL = 'unsubscribeFromChannel'
export const WEBSOCKET_PERFORM_COMMAND = 'websocketPerform'
export const WEBSOCKET_MESSAGE_COMMAND = 'websocketMessage'
export const WORKER_MSG_ERROR_COMMAND = 'workerMsgError'
export const VISIBILITY_SHOW_COMMAND = 'visibilityShow'
export const VISIBILITY_HIDDEN_COMMAND = 'visibilityHidden'

export const ALL_COMMANDS = [
  PING_COMMAND,
  PONG_COMMAND,
  SUBSCRIBE_TO_CHANNEL,
  UNSUBSCRIBE_FROM_CHANNEL,
  WEBSOCKET_PERFORM_COMMAND,
  WEBSOCKET_MESSAGE_COMMAND,
  WORKER_MSG_ERROR_COMMAND,
  VISIBILITY_SHOW_COMMAND,
  VISIBILITY_HIDDEN_COMMAND
]
