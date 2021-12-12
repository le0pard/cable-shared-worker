import {
  PONG_COMMAND,
  WORKER_MSG_ERROR_COMMAND
} from 'cable-shared/constants'
import {
  addPortForStore,
  updatePortPongTime,
  startPortsAliveCheck
} from './workerPorts'
import {loadCableApiWrapper} from './workerCable'

const DEFAULT_OPTIONS = {
  cableType: 'actioncable', // anycable, actioncable
  cableLibrary: null // library require
}

const isSharedWorker = (
  self &&
  typeof SharedWorkerGlobalScope !== 'undefined' &&
  self instanceof SharedWorkerGlobalScope
)

const captureWorkerError = ({port, event}) => {
  port.postMessage({command: WORKER_MSG_ERROR_COMMAND, event: event.toString()})
}

const handleWorkerMessages = ({id, event}) => {
  const message = event?.data

  switch (message?.command) {
    case PONG_COMMAND: { // update port lifetime
      updatePortPongTime(id)
      return
    }
    default: {
      // nothing
    }
  }
}

const registerPort = (port) => {
  const id = addPortForStore(port)
  port.addEventListener('message', (event) => handleWorkerMessages({port, id, event}))
  port.addEventListener('messageerror', (event) => captureWorkerError({port, id, event}))
}

// check that we are in shared worker context
if (isSharedWorker) {
  // Event handler called when a tab tries to connect to this worker.
  self.addEventListener('connect', (e) => {
    // Get the MessagePort from the event. This will be the
    // communication channel between SharedWorker and the Tab
    const port = e.ports[0]
    registerPort(port)
    port.start() // Required when using addEventListener. Otherwise called implicitly by onmessage setter.
  })
  // checking for dead ports only in shared worker
  startPortsAliveCheck()
} else {
  // in dedicated worker we use self as port (and do not check if it is alive - it will die together with page)
  registerPort(self)
}

const initCableLibrary = (options = {}) => {
  const mergedOptions = {...DEFAULT_OPTIONS, ...options}
  const {cableType, cableLibrary} = mergedOptions
  const api = loadCableApiWrapper(cableType, cableLibrary)
  return api
}

export {
  initCableLibrary
}
