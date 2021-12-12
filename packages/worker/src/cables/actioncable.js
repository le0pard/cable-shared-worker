import {
  WEBSOCKET_MESSAGE_COMMAND
} from 'cable-shared/constants'

export const initActioncableAPI = (api) => {
  let websocketConnection = null
  let portReceiverMapping = {}

  return {
    createCable: (url) => (
      new Promise((resolve) => {
        if (websocketConnection) {
          return resolve()
        }
        websocketConnection = api.createConsumer(url)
        return resolve()
      })
    ),
    subscribeTo: ({port, portID, id, channel, params = {}}) => {
      const subscriptionChannel = websocketConnection.subscriptions.create({
        ...params,
        channel
      }, {
        received: (data) => {
          port.postMessage({command: WEBSOCKET_MESSAGE_COMMAND, data, id})
        }
      })

      portReceiverMapping = {
        ...portReceiverMapping,
        [portID]: {
          ...(portReceiverMapping[portID] || {}),
          [id]: subscriptionChannel
        }
      }
    },
    unsubscribeFrom: (portID, id) => {
      if (portReceiverMapping[portID] && portReceiverMapping[portID][id]) {
        portReceiverMapping[portID][id].unsubscribe()

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
                portReceiverMapping[portKey][keySub].unsubscribe()
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
      new Promise((resolve) => {
        if (websocketConnection) {
          websocketConnection.disconnect()
          websocketConnection = null
        }
        return resolve()
      })
    )
  }
}
