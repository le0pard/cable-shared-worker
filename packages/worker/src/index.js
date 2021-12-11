import {
  PING_COMMAND,
  PONG_COMMAND
} from 'cable-shared/constants'

import {addPortForStore, updatePortPongTime, startPortsAliveCheck} from './utils/swPorts'

const isSharedWorker = (
  self &&
  typeof SharedWorkerGlobalScope !== 'undefined' &&
  self instanceof SharedWorkerGlobalScope
)

const captureWorkerError = ({event}) => {
  console.error(event)
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
  port.addEventListener('message', (event) => handleWorkerMessages({id, event}))
  port.addEventListener('messageerror', (event) => captureWorkerError({id, event}))
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

const initWebsocket = (wsUrl, options = {}) => (
  new Promise((resolve, reject) => {

  })
)

const closeWebsocket = () => (
  new Promise((resolve, reject) => {

  })
)

export {
  initWebsocket,
  closeWebsocket
}
