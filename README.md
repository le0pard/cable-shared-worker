# Cable-shared-worker (CableSW) - ActionCable and AnyCable Shared Worker support

Cable-shared-worker is running ActionCable or AnyCable client in a shared webworker allows you to share a single websocket connection for multiple browser windows and tabs.

## Motivation

 - It's more efficient to have a single websocket connection
 - Page refreshes and new tabs already have a websocket connection, so connection setup time is zero
 - The websocket connection runs in a separate thread/process so your UI is 'faster'
 - Cordination of event notifications is simpler as updates have a single source
 - Close connection for non active tabs (visibility API)
 - It's the cool stuff..

## Usage

### Install

```bash
npm install @cable-shared-worker/web @cable-shared-worker/worker
# or
yarn add @cable-shared-worker/web @cable-shared-worker/worker
```

### Web

You need to initialize worker inside your JS file:

```js
import {initWorker} from '@cable-shared-worker/web'

await initWorker('/worker.js')
```

Second argument accept different options:

```js
await initWorker(
  '/worker.js',
  {
    workerOptions: { // worker options - more info https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker/SharedWorker
      name: 'CabelWS'
    },
    onError: (error) => console.error(error), // subscribe to worker errors
    fallbackToWebWorker: true, // switch to web worker on safari
    visibilityTimeout: 0, // timeout for visibility API, before close channels; 0 is disabled
    onVisibilityChange: () => ({}) // subscribe for visibility changes
  }
)
```

Start subscription channel:

```js
import {createChannel} from '@cable-shared-worker/web'

// Subscribe to the server channel via the client
const channel = await createChannel('ChatChannel', {roomId: 42}, (data) => {
  console.log(data)
})

// call `ChatChannel#speak(data)` on the server
channel.perform('speak', {msg: 'Hello'})

// Unsubscribe from the channel
channel.unsubscribe()
```

Close worker (for shared worker this will only close current tab connection, but not worker itself):

```js
import {closeWorker} from '@cable-shared-worker/web'

// close tab connection to worker
closeWorker()
```

This helper values may help to get info what kind of workers available in browser:

```js
import {
  isWorkersAvailable,
  isSharedWorkerAvailable,
  isWebWorkerAvailable
} from '@cable-shared-worker/web'

isWorkersAvailable // value is true, if Shared or Web worker available
isSharedWorkerAvailable // value is true, if Shared worker available
isWebWorkerAvailable // value is true, if Web worker available
```

#### Visibility API

You can use [Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) to detect, that user move tab on background and close tab channels. Shared Worker websocket connection will closed, if no active channels (until user visited any tab).

```js
import {initWorker} from '@cable-shared-worker/web'

initWorker(
  '/worker.js',
  {
    visibilityTimeout: 60, // 60 seconds wait before start close channels, default 0 is disable this functionality
    onVisibilityChange: (isVisible, isChannelsWasPaused) => { // callback for visibility changes
      if (isVisible && isChannelsWasPaused) {
        // this condition can be used to fetch data changes, because channels was closed due to tab on background
      }
    }
  }
)
```

### Worker

In worker script (in example `/worker.js`) you need initialize websocket connection.

For actioncable you need installed [@rails/actioncable](https://www.npmjs.com/package/@rails/actioncable) package:

```js
import * as actioncableLibrary from '@rails/actioncable'
import {initCableLibrary} from '@cable-shared-worker/worker'

// init actioncable library
const api = initCableLibrary({
  cableType: 'actioncable',
  cableLibrary: actioncableLibrary
})

// connect by websocket url
api.createCable(WebSocketURL)
```

For anycable you need install [@anycable/web](https://www.npmjs.com/package/@anycable/web) package:

```js
import * as anycableLibrary from '@anycable/web'
import {initCableLibrary} from '@cable-shared-worker/worker'

// init anycable library
const api = initCableLibrary({
  cableType: 'anycable',
  cableLibrary: anycableLibrary
})

// connect by websocket url
api.createCable(WebSocketURL)
```

You can also use Msgpack and Protobuf protocols supported by [AnyCable Pro](https://anycable.io/#pro) (you must install the corresponding encoder package yourself):

```js
import * as anycableLibrary from '@anycable/web'
import {MsgpackEncoder} from '@anycable/msgpack-encoder'
import {initCableLibrary} from '@cable-shared-worker/worker'

const api = initCableLibrary({
  cableType: 'anycable',
  cableLibrary: anycableLibrary
})

api.createCable(
  webSocketURL,
  {
    protocol: 'actioncable-v1-msgpack',
    encoder: new MsgpackEncoder()
  }
)

// or for protobuf
import * as anycableLibrary from '@anycable/web'
import {ProtobufEncoder} from '@anycable/protobuf-encoder'
import {initCableLibrary} from '@cable-shared-worker/worker'

const api = initCableLibrary({
  cableType: 'anycable',
  cableLibrary: anycableLibrary
})

api.createCable(
  webSocketURL,
  {
    protocol: 'actioncable-v1-protobuf',
    encoder: new ProtobufEncoder()
  }
)
```

For manuaaly close websocket connection you can use `destroyCable`:

```js
import * as actioncableLibrary from '@rails/actioncable'
import {initCableLibrary} from '@cable-shared-worker/worker'

const api = initCableLibrary({
  cableType: 'actioncable',
  cableLibrary: actioncableLibrary
})

api.createCable(WebSocketURL)

// later in code

api.destroyCable()
```

Method `initCableLibrary` accept additional option `closeWebsocketWithoutChannels`:

```js
const api = initCableLibrary({
  cableType: 'actioncable',
  cableLibrary: actioncableLibrary,
  // if true (default), worker will close websocket connection, if have zero active channels
  // example: all website tabs went on background and call worker to close channels by timeout
  closeWebsocketWithoutChannels: false
})
```

## Browser Support

Supported modern browsers (not IE, Opera Mini), that support Shared Worker.

Note: Browser Safari does not support [Shared Worker](https://caniuse.com/sharedworkers). By default system will switch to Web Worker, which cannot share connection between tabs. You can disable fallback to Web Worker by `fallbackToWebWorker: false` (or use `isSharedWorkerAvailable` for own logic).
