import {
  PING_COMMAND,
  PONG_COMMAND,
  WORKER_MSG_ERROR_COMMAND
} from 'cable-shared/constants'

const DEFAULT_OPTIONS = {
  workerOptions: {
    name: 'CabelWS'
  },
  onError: (error) => {console.log(error)}, /* eslint-disable-line no-console */
  fallbackToWebWorker: true // switch to web worker on safari
}

const TYPE_SHARED_WORKER = 'shared'
const TYPE_WEB_WORKER = 'web'

const webWorkerAvailable = !!window.Worker
const sharedWorkerAvailable = !!window.SharedWorker

let workerPort = null

const handleWorkerMessages = ({event, options = {}}) => {
  const message = event?.data

  switch (message?.command) {
    case PING_COMMAND: { // always response on ping
      workerPort.postMessage({command: PONG_COMMAND})
      return
    }
    case WORKER_MSG_ERROR_COMMAND: { // get error from worker
      options.onError(message.event)
      return
    }
    default: {
      // nothing
    }
  }
}

const startWorker = ({resolve, reject, workerUrl, type = TYPE_SHARED_WORKER, options = {}, workerOptions = {}}) => {
  try {
    if (type === TYPE_SHARED_WORKER) {
      workerPort = new window.SharedWorker(workerUrl, workerOptions).port
    } else {
      workerPort = new window.Worker(workerUrl, workerOptions)
    }
  } catch (e) {
    return reject(e)
  }
  if (!workerPort) {
    return reject('Error to create worker')
  }

  workerPort.addEventListener('message', (event) => handleWorkerMessages({event, options}))
  if (options.onError) {
    workerPort.addEventListener('error', (event) => options.onError(event.toString()))
    workerPort.addEventListener('messageerror', (event) => options.onError(event.toString()))
  }

  if (type === TYPE_SHARED_WORKER) {
    workerPort.start() // we need start port only for shared worker
  }

  return resolve()
}

const initWorker = (workerUrl, options = {}) => (
  new Promise((resolve, reject) => {
    if (workerPort) {
      return resolve()
    }

    if (!workerUrl) {
      return reject('Need to provide worker url')
    }

    const {workerOptions, ...restOptions} = options

    const mergedOptions = {
      ...DEFAULT_OPTIONS,
      ...restOptions
    }

    const workerArgs = {
      resolve,
      reject,
      options: mergedOptions,
      workerUrl,
      workerOptions: {
        ...(DEFAULT_OPTIONS.workerOptions || {}),
        ...(workerOptions || {})
      }
    }

    if (sharedWorkerAvailable) {
      return startWorker({
        ...workerArgs,
        type: TYPE_SHARED_WORKER
      })
    }

    if (!sharedWorkerAvailable && !mergedOptions.fallbackToWebWorker) {
      return reject('Shared worker not available')
    }

    if (webWorkerAvailable) {
      return startWorker({
        ...workerArgs,
        type: TYPE_WEB_WORKER
      })
    }

    return reject('Shared worker and Web worker not available')
  })
)

const createSubscription = (channel, params = {}, onReceiveMessage = (() => {})) => (
  new Promise((resolve, reject) => {
    if (!workerPort) {
      return reject('You need create worker by initWorker method before call createSubscription method')
    }

  })
)

const closeWorker = () => (
  new Promise((resolve) => {
    if (workerPort) {
      if (workerPort.close) {
        workerPort.close() // close shared worker port
      }
      if (workerPort.terminate) {
        workerPort.terminate() // close web worker port
      }
      workerPort = null
    }
    resolve()
  })
)

export {
  initWorker,
  createSubscription,
  closeWorker
}
