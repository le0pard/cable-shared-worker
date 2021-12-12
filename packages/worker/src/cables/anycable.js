export const initAnycableAPI = (api) => {
  let websocketConnection = null

  return {
    createCable: (url, options = {}) => (
      new Promise((resolve) => {
        websocketConnection = api.createCable(url, options)
        return resolve()
      })
    ),
    subscribeTo: (channel, params = {}, onReceiveMessage = (() => { })) => {

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
