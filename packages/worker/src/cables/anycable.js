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

    },
    unsubscribeFrom: (portID, id) => {

    },
    unsubscribeAllFromPort: (portID) => {

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
