import {
  WEBSOCKET_MESSAGE_COMMAND
} from 'cable-shared/constants'

export const initAnycableAPI = (api) => {
  let websocketConnection = null
  let portReceiverMapping = {}

  return {
    createCable: (url, options = {}) => (
      new Promise((resolve) => {
        websocketConnection = api.createCable(url, options)
        return resolve()
      })
    ),
    subscribeTo: ({port, portID, id, channel, params = {}}) => {
      websocketConnection.subscribeTo(channel, params).then((subscriptionChannel) => {
        subscriptionChannel.on('message', (data) => {
          port.postMessage({command: WEBSOCKET_MESSAGE_COMMAND, data, id})
        })

        portReceiverMapping = {
          ...portReceiverMapping,
          [portID]: {
            ...(portReceiverMapping[portID] || {}),
            [id]: subscriptionChannel
          }
        }
      })
    },
    unsubscribeFrom: (portID, id) => {
      if (portReceiverMapping[portID] && portReceiverMapping[portID][id]) {
        portReceiverMapping[portID][id].disconnect()

        portReceiverMapping = Object.keys(portReceiverMapping).reduce((aggPorts, portKey) => {
          const subsMap = Object.keys(portReceiverMapping[portKey]).reduce((aggSub, keySub) => {
            if (portKey === portID && keySub === id) {
              return aggSub
            }
            return {
              ...aggSub,
              [keySub]: portReceiverMapping[portKey][keySub]
            }
          }, {})

          if (Object.keys(subsMap).length > 0) {
            return {
              ...aggPorts,
              [portKey]: subsMap
            }
          }

          return aggPorts
        }, {})
      }
    },
    unsubscribeAllFromPort: (portID) => {
      if (portReceiverMapping[portID]) {

        portReceiverMapping = Object.keys(portReceiverMapping).reduce((aggPorts, portKey) => {
          if (portKey === portID) {
            Object.keys(portReceiverMapping[portKey]).forEach((keySub) => {
              if (portReceiverMapping[portKey][keySub]) {
                portReceiverMapping[portKey][keySub].disconnect()
              }
            })

            return aggPorts
          }

          return {
            ...aggPorts,
            [portKey]: portReceiverMapping[portKey]
          }
        }, {})
      }
    },
    destroyCable: () => (
      new Promise((resolve, reject) => {
        if (websocketConnection) {
          return websocketConnection.disconnect().then(() => {
            websocketConnection = null
          }).catch(reject)
        }
        return resolve()
      })
    )
  }
}
