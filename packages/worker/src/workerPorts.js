import { uuid } from './../../../shared/uuid'
import { PING_COMMAND } from './../../../shared/constants'

const PORT_TICK_TIME = 5 * 1000 // microseconds
const PORT_MAX_TTL = 21 * 1000 // microseconds

let activePorts = {}

const sendPingCommandToPorts = () => {
  Object.keys(activePorts).forEach((id) => {
    const { port } = activePorts[id]
    if (port) {
      port.postMessage({ command: PING_COMMAND })
    }
  })
}

const removeDeadPortsFromStore = (cleanupCallback = () => ({})) => {
  sendPingCommandToPorts() // lets ping our ports before remove
  const now = new Date()

  activePorts = Object.keys(activePorts).reduce((agg, id) => {
    const { pongResponseTime, port } = activePorts[id]
    if (pongResponseTime && now.getTime() - pongResponseTime.getTime() > PORT_MAX_TTL) {
      // looks like tab was closed
      if (cleanupCallback) {
        cleanupCallback({ id, port })
      }
      return agg
    }
    return {
      ...agg,
      [id]: activePorts[id]
    }
  }, {})
}

// needed for tests
export const __getActivePorts = () => activePorts
export const __resetActivePorts = () => {
  activePorts = []
}

export const addPortForStore = (port) => {
  const id = uuid()
  activePorts = {
    ...activePorts,
    [id]: {
      port,
      pongResponseTime: new Date()
    }
  }
  return id
}

export const updatePortPongTime = (id) => {
  if (activePorts[id]) {
    activePorts = {
      ...activePorts,
      [id]: {
        ...activePorts[id],
        pongResponseTime: new Date()
      }
    }
  }
}

export const recurrentPortsChecks = (cleanupCallback = () => ({})) => {
  return setInterval(() => {
    removeDeadPortsFromStore(cleanupCallback)
  }, PORT_TICK_TIME)
}
