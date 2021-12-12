export const initActioncableAPI = (api) => {
  let websocketConnection = null

  return {
    createCable: (url) => (
      new Promise((resolve) => {
        websocketConnection = api.createConsumer(url)
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
