# Cable-shared-worker (CableSW) - ActionCable and AnyCable Shared Worker support

Cable-shared-worker - running ActionCable or AnyCable client in a shared webworker allows you to share a single websocket connection for multiple browser windows and tabs.

## Motivation

 - It's more efficient to have a single websocket connection
 - Page refreshes and new tabs already have a websocket connection, so connection setup time is zero
 - The websocket connection runs in a separate thread/process so your UI is 'faster'
 - Cordination of event notifications is simpler as updates have a single source
 - Close connection for non active windows and tabs (visibility API)
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

Start subscription channel:

```js
import {createChannel} from '@cable-shared-worker/web'

// Subscribe to the server channel via the client
const channel = await createChannel('ChatChannel', {roomId: 42}, (data) => {
  console.log(data)
})

// call `ChatChannel#speak(data)` on the server
channel.perform('speak', { msg: 'Hello' })

// Unsubscribe from the channel
channel.unsubscribe()
```

#### Visibility API

You can use [Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) to detect, that user move tab/window on background and close tab channels. Shared Worker websocket connection will closed, if no active channels (until user visited any tab/window).

```js
import {initWorker} from '@cable-shared-worker/web'

initWorker(
  '/worker.js',
  {
    visibilityTimeout: 60, // 60 seconds wait before start close channels, default 0 is disable this functionality
    onVisibilityChange: (isVisible, isChannelsWasPaused) => { // callback send info if visibility changed
      if (isVisible && isChannelsWasPaused) {
        // this condition can be used to fetch API about data changes, because channels was closed due to tab on background
      }
    }
  }
)
```

### Worker

In worker script (in example `worker.js`) you need initialize websocket connection.

For actioncable you need installed [@rails/actioncable](https://www.npmjs.com/package/@rails/actioncable) package:

```js
import * as actioncableLibrary from '@rails/actioncable'
import {initCableLibrary} from '@cable-shared-worker/worker'

const api = initCableLibrary({
  cableType: 'actioncable',
  cableLibrary: actioncableLibrary
})

api.createCable(WebSocketURL)
```

For anycable you need install [@anycable/web](https://www.npmjs.com/package/@anycable/web) package:

```js
import * as anycableLibrary from '@anycable/web'
import {initCableLibrary} from '@cable-shared-worker/worker'

const api = initCableLibrary({
  cableType: 'anycable',
  cableLibrary: anycableLibrary
})

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

## Browsers support

Supported in Chrome 4+, Edge 79+, Firefox 55+, Opera 57+ browsers.

Browser Safari does not support Shared Workers. By default system will switch to Web worker, which cannot share connection between tabs. You can disable fallback to web worker by `fallbackToWebWorker: false`.
