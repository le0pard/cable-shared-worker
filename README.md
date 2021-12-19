# Cable-shared-worker (CableSW) - ActionCable and AnyCable Shared Worker support [![Test/Build/Deploy](https://github.com/le0pard/cable-shared-worker/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/le0pard/cable-shared-worker/actions/workflows/release.yml)

![after](https://user-images.githubusercontent.com/98444/146680498-af308e73-a69d-451c-9f9d-0f8055ebab6c.png)

Cable-shared-worker is running ActionCable or AnyCable client in a Shared Worker allows you to share a single websocket connection for multiple browser windows and tabs.

## Motivation

 - It's more efficient to have a single websocket connection
 - Page refreshes and new tabs already have a websocket connection, so connection setup time is zero
 - The websocket connection runs in a separate thread/process so your UI is 'faster'
 - Cordination of event notifications is simpler as updates have a single source
 - Close connection for non active (on background) tabs (by [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API))
 - It's the cool stuff...

## Install

```bash
npm install @cable-shared-worker/web @cable-shared-worker/worker
# or
yarn add @cable-shared-worker/web @cable-shared-worker/worker
```

Both packages should be the same version.

## Web

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
      name: 'CableSW'
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

You can manually close worker (for shared worker this will only close current tab connection, but not worker itself):

```js
import {closeWorker} from '@cable-shared-worker/web'

// close tab connection to worker
closeWorker()
```

This helpers may help to get info what kind of workers available in browser:

```js
import {
  isWorkersAvailable,
  isSharedWorkerAvailable,
  isWebWorkerAvailable
} from '@cable-shared-worker/web'

isWorkersAvailable // return true, if Shared or Web worker available
isSharedWorkerAvailable // return true, if Shared worker available
isWebWorkerAvailable // return true, if Web worker available
```

### Visibility API

You can use [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) to detect, that user move tab on background and close websocket channels. Shared Worker websocket connection can be closed, if no active channels (behaviour controlled by option `closeWebsocketWithoutChannels` in worker component).

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

## Worker

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

If you need manually close websocket connection, you can use `destroyCable` method:

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
  // example: all tabs on the background send a signal to close all channels by visibility API timeout
  closeWebsocketWithoutChannels: false
})
```

## Browser Support

Supported modern browsers, that support Shared Worker (IE, Opera Mini not supported).

Browser Safari does not support [Shared Worker](https://caniuse.com/sharedworkers). Package will switch to Web Worker, which cannot share connection between tabs. You can disable fallback to Web Worker by `fallbackToWebWorker: false` (or use `isSharedWorkerAvailable` for own logic).

## Development

```bash
$ yarn # install all dependencies
$ yarn dev # run development build with watch functionality
$ yarn build # run production build
$ yarn lint # run eslint checks
$ yarn test # run tests
```

