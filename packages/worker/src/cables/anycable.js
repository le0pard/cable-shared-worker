import {
  WEBSOCKET_MESSAGE_COMMAND
} from 'cable-shared/constants'

const STATUS_CONNECTED = 'connected'
const STATUS_PAUSED = 'paused'
const STATUS_DISCONNECTED = 'disconnected'

export const initAnycableAPI = (api, options = {}, hooks = {}) => {
  let websocketConnection = null
  let websocketConnectionStatus = STATUS_DISCONNECTED
  let portReceiverMapping = {}

  const isActive = () => !!websocketConnection && websocketConnectionStatus === STATUS_CONNECTED
  const isPaused = () => !!websocketConnection && websocketConnectionStatus === STATUS_PAUSED
  const isDisconnected = () => !websocketConnection

  const pauseConnection = () => {
    websocketConnection.disconnect()
    websocketConnectionStatus = STATUS_PAUSED
  }

  const resumeConnection = () => {
    websocketConnection.connect()
    websocketConnectionStatus = STATUS_CONNECTED
  }

  const resumeConnectionIfNeeded = () => {
    if (options?.closeWebsocketWithoutChannels && isPaused()) {
      resumeConnection()
    }
  }

  const pauseConnectionIfNeeded = () => {
    if (options?.closeWebsocketWithoutChannels) {
      const haveActiveChannels = Object.keys(portReceiverMapping).some((portKey) => {
        return Object.keys(portReceiverMapping[portKey]).some((keySub) => {
          return portReceiverMapping[portKey][keySub] && !!portReceiverMapping[portKey][keySub]?.channel
        })
      })

      if (!haveActiveChannels && isActive()) {
        pauseConnection()
      }
    }
  }

  return {
    isActive,
    isPaused,
    isDisconnected,
    createCable: (url, options = {}) => (
      new Promise((resolve) => {
        if (websocketConnection) {
          return resolve()
        }
        websocketConnection = api.createCable(url, options)
        websocketConnectionStatus = STATUS_CONNECTED
        if (hooks?.connect) {
          hooks.connect()
        }
        return resolve()
      })
    ),
    subscribeTo: ({port, portID, id, channel, params = {}}) => {
      resumeConnectionIfNeeded()

      const channelData = {channel, params}
      websocketConnection.subscribeTo(channel, params).then((subscriptionChannel) => {
        subscriptionChannel.on('message', (data) => {
          port.postMessage({command: WEBSOCKET_MESSAGE_COMMAND, data, id})
        })

        portReceiverMapping = {
          ...portReceiverMapping,
          [portID]: {
            ...(portReceiverMapping[portID] || {}),
            [id]: {
              channel: subscriptionChannel,
              channelData
            }
          }
        }
      })
    },
    unsubscribeFrom: (portID, id) => {
      if (portReceiverMapping[portID] && portReceiverMapping[portID][id]?.channel) {
        portReceiverMapping[portID][id].channel.disconnect()

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

        pauseConnectionIfNeeded()
      }
    },
    unsubscribeAllFromPort: (portID) => {
      if (portReceiverMapping[portID]) {

        portReceiverMapping = Object.keys(portReceiverMapping).reduce((aggPorts, portKey) => {
          if (portKey === portID) {
            Object.keys(portReceiverMapping[portKey]).forEach((keySub) => {
              if (portReceiverMapping[portKey][keySub]?.channel) {
                portReceiverMapping[portKey][keySub].channel.disconnect()
              }
            })

            return aggPorts
          }

          return {
            ...aggPorts,
            [portKey]: portReceiverMapping[portKey]
          }
        }, {})

        pauseConnectionIfNeeded()
      }
    },
    resumeChannels: ({id, port}) => {
      if (portReceiverMapping[id]) {
        resumeConnectionIfNeeded()

        Promise.all(
          Object.keys(portReceiverMapping[id]).map((keySub) => {
            if (portReceiverMapping[id][keySub]?.channelData) {
              const {channelData} = portReceiverMapping[id][keySub]
              const {channel, params} = channelData
              return websocketConnection.subscribeTo(channel, params).then((subscriptionChannel) => {
                subscriptionChannel.on('message', (data) => {
                  port.postMessage({command: WEBSOCKET_MESSAGE_COMMAND, data, id: keySub})
                })

                return [
                  keySub,
                  {
                    channel: subscriptionChannel,
                    channelData
                  }
                ]
              })
            }
            return Promise.resolve(null)
          })
        ).then((values) => {
          const restoredChannels = values.filter(Boolean).reduce((agg, [keySub, data]) => {
            return {
              ...agg,
              [keySub]: data
            }
          }, {})

          portReceiverMapping = {
            ...portReceiverMapping,
            [id]: restoredChannels
          }
        })
      }
    },
    pauseChannels: ({id}) => {
      if (portReceiverMapping[id]) {
        portReceiverMapping = {
          ...portReceiverMapping,
          [id]: Object.keys(portReceiverMapping[id]).reduce((aggSub, keySub) => {
            if (portReceiverMapping[id][keySub]?.channel) {
              const {channel, ...restData} = portReceiverMapping[id][keySub]
              channel.disconnect()
              return {
                ...aggSub,
                [keySub]: restData
              }
            }
            return aggSub
          }, {})
        }
      }
      pauseConnectionIfNeeded()
    },
    destroyCable: () => (
      new Promise((resolve) => {
        if (websocketConnection) {
          websocketConnection.disconnect()
          websocketConnection = null
          websocketConnectionStatus = STATUS_DISCONNECTED
        }
        if (hooks?.disconnect) {
          hooks.disconnect()
        }
        return resolve()
      })
    )
  }
}
