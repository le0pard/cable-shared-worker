import {ACTIONCABLE_TYPE, WEBSOCKET_MESSAGE_COMMAND} from './../../../shared/constants'

const UNSUBSCRIBE_CHECK_TIMEOUT = 300 // give time to unsubscribe from channels

const STATUS_CONNECTED = 'connected'
const STATUS_PAUSED = 'paused'
const STATUS_DISCONNECTED = 'disconnected'

export const initCableWrapper = (apiType = ACTIONCABLE_TYPE, api, options = {}, hooks = {}) => {
  let websocketConnection = null
  let websocketConnectionStatus = STATUS_DISCONNECTED
  let portReceiverMapping = {}

  const isActioncableAPI = apiType === ACTIONCABLE_TYPE

  const isActive = () => !!websocketConnection && websocketConnectionStatus === STATUS_CONNECTED
  const isPaused = () => !!websocketConnection && websocketConnectionStatus === STATUS_PAUSED
  const isDisconnected = () => !websocketConnection

  const pauseConnection = () => {
    if (websocketConnection) {
      websocketConnection.disconnect()
    }
    websocketConnectionStatus = STATUS_PAUSED
  }

  const resumeConnection = () => {
    if (websocketConnection) {
      websocketConnection.connect()
    }
    websocketConnectionStatus = STATUS_CONNECTED
  }

  const resumeConnectionIfNeeded = () => {
    if (options?.closeWebsocketWithoutChannels && isPaused()) {
      resumeConnection()
    }
  }

  const pauseConnectionIfNeeded = () => {
    if (options?.closeWebsocketWithoutChannels && isActive()) {
      const haveActiveChannels = Object.keys(portReceiverMapping).some((portKey) => {
        return Object.keys(portReceiverMapping[portKey]).some((keySub) => {
          return (
            portReceiverMapping[portKey][keySub] && !!portReceiverMapping[portKey][keySub]?.channel
          )
        })
      })

      if (!haveActiveChannels) {
        pauseConnection()
      }
    }
  }

  return {
    isActive,
    isPaused,
    isDisconnected,
    createCable: (wUrl, wOptions = {}) =>
      new Promise((resolve) => {
        if (websocketConnection) {
          return resolve()
        }
        websocketConnection = isActioncableAPI
          ? api.createConsumer(wUrl)
          : api.createCable(wUrl, wOptions)
        websocketConnectionStatus = STATUS_CONNECTED
        if (hooks?.connect) {
          hooks.connect()
        }
        return resolve()
      }),
    subscribeTo: ({port, portID, id, channel, params = {}}) => {
      resumeConnectionIfNeeded()

      const channelData = {channel, params}

      const addSubscription = (subscriptionChannel) => {
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
      }

      if (isActioncableAPI) {
        const subscriptionChannel = websocketConnection.subscriptions.create(
          {
            ...params,
            channel
          },
          {
            received: (data) => {
              port.postMessage({command: WEBSOCKET_MESSAGE_COMMAND, data, id})
            }
          }
        )

        return addSubscription(subscriptionChannel)
      } else {
        return websocketConnection.subscribeTo(channel, params).then((subscriptionChannel) => {
          subscriptionChannel.on('message', (data) => {
            port.postMessage({command: WEBSOCKET_MESSAGE_COMMAND, data, id})
          })

          return addSubscription(subscriptionChannel)
        })
      }
    },
    performInChannel: (portID, id, {action, params = {}}) => {
      if (portReceiverMapping[portID] && portReceiverMapping[portID][id]?.channel) {
        const {channel} = portReceiverMapping[portID][id]
        channel.perform(action, params)
      }
    },
    unsubscribeFrom: (portID, id) => {
      if (portReceiverMapping[portID] && portReceiverMapping[portID][id]?.channel) {
        const {channel} = portReceiverMapping[portID][id]
        if (isActioncableAPI) {
          channel.unsubscribe()
        } else {
          channel.disconnect()
        }

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

        setTimeout(() => pauseConnectionIfNeeded(), UNSUBSCRIBE_CHECK_TIMEOUT)
      }
    },
    unsubscribeAllFromPort: (portID) => {
      if (portReceiverMapping[portID]) {
        portReceiverMapping = Object.keys(portReceiverMapping).reduce((aggPorts, portKey) => {
          if (portKey === portID) {
            Object.keys(portReceiverMapping[portKey]).forEach((keySub) => {
              if (portReceiverMapping[portKey][keySub]?.channel) {
                const {channel} = portReceiverMapping[portKey][keySub]
                if (isActioncableAPI) {
                  channel.unsubscribe()
                } else {
                  channel.disconnect()
                }
              }
            })

            return aggPorts
          }

          return {
            ...aggPorts,
            [portKey]: portReceiverMapping[portKey]
          }
        }, {})

        setTimeout(() => pauseConnectionIfNeeded(), UNSUBSCRIBE_CHECK_TIMEOUT)
      }
    },
    resumeChannels: ({id, port}) => {
      if (portReceiverMapping[id]) {
        resumeConnectionIfNeeded()

        const haveInactiveChannels = Object.keys(portReceiverMapping[id]).some(
          (keySub) =>
            !portReceiverMapping[id][keySub]?.channel &&
            !!portReceiverMapping[id][keySub]?.channelData
        )

        if (!haveInactiveChannels) {
          return
        }

        if (isActioncableAPI) {
          portReceiverMapping = {
            ...portReceiverMapping,
            [id]: Object.keys(portReceiverMapping[id]).reduce((aggSub, keySub) => {
              if (
                portReceiverMapping[id][keySub]?.channelData &&
                !portReceiverMapping[id][keySub]?.channel
              ) {
                const {channel, params} = portReceiverMapping[id][keySub].channelData
                const subscriptionChannel = websocketConnection.subscriptions.create(
                  {
                    ...params,
                    channel
                  },
                  {
                    received: (data) => {
                      port.postMessage({command: WEBSOCKET_MESSAGE_COMMAND, data, id: keySub})
                    }
                  }
                )
                return {
                  ...aggSub,
                  [keySub]: {
                    ...portReceiverMapping[id][keySub],
                    channel: subscriptionChannel
                  }
                }
              } else if (portReceiverMapping[id][keySub]?.channel) {
                return {
                  ...aggSub,
                  [keySub]: portReceiverMapping[id][keySub]
                }
              }
              return aggSub
            }, {})
          }
        } else {
          Promise.all(
            Object.keys(portReceiverMapping[id]).map((keySub) => {
              if (
                portReceiverMapping[id][keySub]?.channelData &&
                !portReceiverMapping[id][keySub]?.channel
              ) {
                const {channelData} = portReceiverMapping[id][keySub]
                const {channel, params} = channelData
                return websocketConnection
                  .subscribeTo(channel, params)
                  .then((subscriptionChannel) => {
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
              if (portReceiverMapping[id][keySub]?.channel) {
                return Promise.resolve([keySub, portReceiverMapping[id][keySub]])
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
      }
    },
    pauseChannels: ({id}) => {
      if (portReceiverMapping[id]) {
        portReceiverMapping = {
          ...portReceiverMapping,
          [id]: Object.keys(portReceiverMapping[id]).reduce((aggSub, keySub) => {
            if (
              portReceiverMapping[id][keySub]?.channel &&
              portReceiverMapping[id][keySub]?.channelData
            ) {
              const {channel, ...restData} = portReceiverMapping[id][keySub]
              if (isActioncableAPI) {
                channel.unsubscribe()
              } else {
                channel.disconnect()
              }

              return {
                ...aggSub,
                [keySub]: restData
              }
            }
            return aggSub
          }, {})
        }

        setTimeout(() => pauseConnectionIfNeeded(), UNSUBSCRIBE_CHECK_TIMEOUT)
      }
    },
    destroyCable: () =>
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
  }
}
