import {
  PONG_COMMAND,
  SUBSCRIBE_TO_CHANNEL,
  UNSUBSCRIBE_FROM_CHANNEL,
  VISIBILITY_SHOW_COMMAND,
  VISIBILITY_HIDDEN_COMMAND,
  WEBSOCKET_PERFORM_COMMAND,
  WORKER_MSG_ERROR_COMMAND,
  ALL_COMMANDS
} from './../../../shared/constants'
import {addPortForStore, updatePortPongTime, recurrentPortsChecks} from './workerPorts'
import {loadCableApiWrapper} from './workerCable'

const DEFAULT_OPTIONS = {
  cableType: 'actioncable', // anycable, actioncable
  cableLibrary: null, // library require
  closeWebsocketWithoutChannels: true, // close websocket if no active channels
  handleCustomWebCommand: null // custom handler web command to worker
}

const isSharedWorker =
  self && typeof SharedWorkerGlobalScope !== 'undefined' && self instanceof SharedWorkerGlobalScope

let cableAPI = null
let cableOptions = {}
let queueChannels = []

const addChannelInQueue = (channel = {}) => {
  queueChannels = [...queueChannels, channel]
}

const cleanChannelsInQueue = () => {
  queueChannels = []
}

const activateChannelInQueue = () => {
  if (!cableAPI) {
    return
  }

  queueChannels.forEach((params) => {
    cableAPI.subscribeTo(params)
  })

  cleanChannelsInQueue()
  return
}

const subscribeToChannel = ({id, port}, channelSettings = {}) => {
  const params = {
    portID: id,
    port,
    id: channelSettings.id,
    channel: channelSettings.channel,
    params: channelSettings.params
  }

  if (!cableAPI || cableAPI.isDisconnected()) {
    addChannelInQueue(params)

    return
  }

  cableAPI.subscribeTo(params)

  return
}

const unsubscribeFromChannel = (portID, id) => {
  if (!cableAPI) {
    return
  }

  cableAPI.unsubscribeFrom(portID, id)

  return
}

const performInChannel = (portID, id, perform) => {
  if (!cableAPI) {
    return
  }

  cableAPI.performInChannel(portID, id, perform)

  return
}

const resumeChannelsForPort = ({id, port}) => {
  if (!cableAPI || cableAPI.isDisconnected()) {
    return
  }

  cableAPI.resumeChannels({id, port})

  return
}

const pauseChannelsForPort = ({id, port}) => {
  if (!cableAPI || cableAPI.isDisconnected()) {
    return
  }

  cableAPI.pauseChannels({id, port})

  return
}

const captureWorkerError = ({port, event}) => {
  port.postMessage({command: WORKER_MSG_ERROR_COMMAND, event: event.toString()})
}

const handleWorkerMessages = ({id, event, port}) => {
  const message = event?.data || {}

  switch (message?.command) {
    case PONG_COMMAND: {
      // update port lifetime
      updatePortPongTime(id)
      return
    }
    case SUBSCRIBE_TO_CHANNEL: {
      subscribeToChannel({id, port}, message?.subscription)
      return
    }
    case UNSUBSCRIBE_FROM_CHANNEL: {
      unsubscribeFromChannel(id, message?.subscription?.id)
      return
    }
    case WEBSOCKET_PERFORM_COMMAND: {
      performInChannel(id, message?.subscription?.id, message?.perform)
      return
    }
    case VISIBILITY_SHOW_COMMAND: {
      resumeChannelsForPort({id, port})
      return
    }
    case VISIBILITY_HIDDEN_COMMAND: {
      pauseChannelsForPort({id, port})
      return
    }
    default: {
      // custom web commands
      if (cableOptions.handleCustomWebCommand) {
        const responseFn = (command, data = {}) => {
          if (ALL_COMMANDS.indexOf(command) >= 0) {
            throw new Error(`Command ${command} busy by cable-shared-worker`)
          }
          port.postMessage({command, data})
        }
        cableOptions.handleCustomWebCommand(message?.command, message?.data, responseFn)
      }
    }
  }
}

const disconnectSubscriptionsFromPort = ({id}) => {
  if (!cableAPI) {
    return
  }

  cableAPI.unsubscribeAllFromPort(id)

  return
}

const registerPort = (port) => {
  const id = addPortForStore(port)
  port.addEventListener('message', (event) => handleWorkerMessages({port, id, event}))
  port.addEventListener('messageerror', (event) => captureWorkerError({port, id, event}))
}

if (isSharedWorker) {
  // Event handler called when a tab tries to connect to this worker.
  self.addEventListener('connect', (e) => {
    // Get the MessagePort from the event. This will be the
    // communication channel between SharedWorker and the Tab
    const port = e.ports[0]
    registerPort(port)
    port.start() // Required when using addEventListener. Otherwise called implicitly by onmessage setter.
  })
  // checking for dead ports in shared worker; for web worker closed tab terminate worker
  recurrentPortsChecks(disconnectSubscriptionsFromPort)
} else {
  // in dedicated worker we use self as port (and do not check if it is alive - it will die together with page)
  registerPort(self)
}

const afterConnect = () => {
  activateChannelInQueue()
}

const afterDisconnect = () => {
  cleanChannelsInQueue()
}

const initCableLibrary = (options = {}) => {
  if (cableAPI) {
    return cableAPI
  }
  cableOptions = {...DEFAULT_OPTIONS, ...options}
  const {cableType, cableLibrary, ...restOptions} = cableOptions
  cableAPI = loadCableApiWrapper(cableType, cableLibrary, restOptions, {
    connect: afterConnect,
    disconnect: afterDisconnect
  })
  return cableAPI
}

export {initCableLibrary}
