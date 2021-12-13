import {uuid} from 'cable-shared/uuid'
import {PING_COMMAND} from 'cable-shared/constants'

const PORT_TICK_TIME = 5 * 1000 // microseconds
const PORT_MAX_TTL = 20 * 1000 // microseconds

let activePorts = {}

const sendPingToPorts = () => {
  Object.keys(activePorts).forEach((id) => {
    const {port} = activePorts[id]
    if (port) {
      port.postMessage({command: PING_COMMAND})
    }
  })
}

const removeDeadPortsFromStore = (cleanupCallback = () => ({})) => {
  const now = new Date()

  activePorts = Object.keys(activePorts).reduce((agg, id) => {
    const {pongResponseTime, port} = activePorts[id]
    if (pongResponseTime && now.getTime() - pongResponseTime.getTime() > PORT_MAX_TTL) {
      cleanupCallback.call(null, {id, port}) // looks like tab was closed
      return agg
    }
    return {
      ...agg,
      [id]: activePorts[id]
    }
  }, {})
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

export const startPortsAliveCheck = (cleanupCallback = () => ({})) => {
  setInterval(() => {
    sendPingToPorts()
    removeDeadPortsFromStore(cleanupCallback)
  }, PORT_TICK_TIME)
}
