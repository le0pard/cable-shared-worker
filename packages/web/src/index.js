import {
  PING_COMMAND,
  PONG_COMMAND,
  SUBSCRIBE_TO_CHANNEL,
  UNSUBSCRIBE_FROM_CHANNEL,
  WEBSOCKET_PERFORM_COMMAND,
  WEBSOCKET_MESSAGE_COMMAND,
  VISIBILITY_SHOW_COMMAND,
  VISIBILITY_HIDDEN_COMMAND,
  WORKER_MSG_ERROR_COMMAND,
  ALL_COMMANDS
} from './../../../shared/constants'
import { uuid } from './../../../shared/uuid'
import { activateVisibilityAPI } from './visibility'

const DEFAULT_OPTIONS = {
  workerOptions: {
    name: 'CableSW'
  },
  onError: (error) => {
    // eslint-disable-next-line no-console
    console.error(error)
  },
  fallbackToWebWorker: true, // switch to web worker on safari
  handleCustomWorkerCommand: null, // custom handler worker command to web
  visibilityTimeout: 0, // 0 is disabled
  onVisibilityChange: null // subscribe for visibility
}

const TYPE_SHARED_WORKER = 'shared'
const TYPE_WEB_WORKER = 'web'

const isWebWorkerAvailable = !!window.Worker
const isSharedWorkerAvailable = !!window.SharedWorker
const isWorkersAvailable = isSharedWorkerAvailable || isWebWorkerAvailable

let workerPort = null
let cableReceiveMapping = {}
let visibilityDeactivation = null

const triggerSubscriptionForChannel = (id, data) => {
  if (cableReceiveMapping[id]) {
    cableReceiveMapping[id](data)
  }
}

const handleWorkerMessages = ({ event, options = {} }) => {
  const message = event?.data || {}

  switch (message?.command) {
    case PING_COMMAND: {
      // always response on ping
      workerPort.postMessage({ command: PONG_COMMAND })
      return
    }
    case WEBSOCKET_MESSAGE_COMMAND: {
      triggerSubscriptionForChannel(message?.id, message?.data)
      return
    }
    case WORKER_MSG_ERROR_COMMAND: {
      // get error from worker
      options.onError(message.event)
      return
    }
    default: {
      // custom worker commands
      if (options.handleCustomWorkerCommand) {
        options.handleCustomWorkerCommand(message?.command, message?.data)
      }
    }
  }
}

const startWorker = ({
  resolve,
  reject,
  workerUrl,
  type = TYPE_SHARED_WORKER,
  options = {},
  workerOptions = {}
}) => {
  try {
    if (type === TYPE_SHARED_WORKER) {
      workerPort = new window.SharedWorker(workerUrl, workerOptions).port
    } else {
      workerPort = new window.Worker(workerUrl, workerOptions)
    }
  } catch (e) {
    return reject(e)
  }
  if (!workerPort) {
    return reject('Error to create worker')
  }

  workerPort.addEventListener('message', (event) => handleWorkerMessages({ event, options }))
  if (options.onError) {
    workerPort.addEventListener('error', (event) => options.onError(event.toString()))
    workerPort.addEventListener('messageerror', (event) => options.onError(event.toString()))
  }

  if (type === TYPE_SHARED_WORKER) {
    workerPort.start() // we need start port only for shared worker
  }

  if (options?.visibilityTimeout && options.visibilityTimeout > 0) {
    visibilityDeactivation = activateVisibilityAPI({
      timeout: options.visibilityTimeout,
      visible: (isChannelsWasPaused) => {
        if (isChannelsWasPaused) {
          workerPort.postMessage({ command: VISIBILITY_SHOW_COMMAND })
        }
        if (options.onVisibilityChange) {
          options.onVisibilityChange(true, isChannelsWasPaused)
        }
      },
      hidden: (isChannelsWasPaused) => {
        if (isChannelsWasPaused) {
          workerPort.postMessage({ command: VISIBILITY_HIDDEN_COMMAND })
        }
        if (options.onVisibilityChange) {
          options.onVisibilityChange(false, isChannelsWasPaused)
        }
      }
    })
  }

  return resolve({
    sendCommand: (command, data = {}) => {
      if (ALL_COMMANDS.indexOf(command) >= 0) {
        throw new Error(`Command ${command} busy by cable-shared-worker`)
      }
      workerPort.postMessage({ command, data })
    }
  })
}

const initWorker = (workerUrl, options = {}) =>
  new Promise((resolve, reject) => {
    if (workerPort) {
      return resolve()
    }

    if (!workerUrl) {
      return reject('Need to provide worker url')
    }

    const { workerOptions, ...restOptions } = options

    const mergedOptions = {
      ...DEFAULT_OPTIONS,
      ...restOptions
    }

    const workerArgs = {
      resolve,
      reject,
      options: mergedOptions,
      workerUrl,
      workerOptions: {
        ...(DEFAULT_OPTIONS.workerOptions || {}),
        ...(workerOptions || {})
      }
    }

    if (isSharedWorkerAvailable) {
      return startWorker({
        ...workerArgs,
        type: TYPE_SHARED_WORKER
      })
    }

    if (!isSharedWorkerAvailable && !mergedOptions.fallbackToWebWorker) {
      return reject('Shared worker not available')
    }

    if (isWebWorkerAvailable) {
      return startWorker({
        ...workerArgs,
        type: TYPE_WEB_WORKER
      })
    }

    return reject('Shared worker and Web worker not available')
  })

const createChannel = (channel, params = {}, onReceiveMessage = () => ({})) =>
  new Promise((resolve, reject) => {
    if (!workerPort) {
      return reject('You need create worker by initWorker method before call createChannel method')
    }

    const id = uuid()
    cableReceiveMapping = {
      ...cableReceiveMapping,
      [id]: onReceiveMessage
    }
    workerPort.postMessage({
      command: SUBSCRIBE_TO_CHANNEL,
      subscription: {
        id,
        channel,
        params
      }
    })

    return resolve({
      perform: (performAction, performParams = {}) => {
        if (workerPort) {
          workerPort.postMessage({
            command: WEBSOCKET_PERFORM_COMMAND,
            subscription: { id },
            perform: {
              action: performAction,
              params: performParams
            }
          })
        }
      },
      unsubscribe: () => {
        cableReceiveMapping = Object.keys(cableReceiveMapping).reduce((agg, key) => {
          if (key === id) {
            return agg
          }
          return {
            ...agg,
            [key]: cableReceiveMapping[key]
          }
        }, {})

        if (workerPort) {
          workerPort.postMessage({
            command: UNSUBSCRIBE_FROM_CHANNEL,
            subscription: { id }
          })
        }
      }
    })
  })

const closeWorker = () =>
  new Promise((resolve) => {
    if (visibilityDeactivation) {
      visibilityDeactivation()
      visibilityDeactivation = null
    }
    if (workerPort) {
      if (workerPort.close) {
        workerPort.close() // close shared worker port
      } else if (workerPort.terminate) {
        workerPort.terminate() // close web worker port
      }
      workerPort = null
    }
    resolve()
  })

export {
  isWorkersAvailable,
  isSharedWorkerAvailable,
  isWebWorkerAvailable,
  initWorker,
  createChannel,
  closeWorker
}
