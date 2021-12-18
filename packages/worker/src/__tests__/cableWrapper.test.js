import {initCableWrapper} from '../cableWrapper'

describe('initCableWrapper', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('createCable', () => {
    describe('actioncable', () => {
      let api = {
        createConsumer: jest.fn()
      }

      it('call createConsumer', () => {
        const wrapper = initCableWrapper('actioncable', api)
        wrapper.createCable('ws://url')

        expect(api.createConsumer.mock.calls.length).toBe(1)
        expect(api.createConsumer.mock.calls[0][0]).toBe('ws://url')
      })
    })

    describe('anycable', () => {
      let api = {
        createCable: jest.fn()
      }

      it('call createCable', () => {
        const wrapper = initCableWrapper('anycable', api)
        wrapper.createCable('ws://url', {protocol: 'test'})

        expect(api.createCable.mock.calls.length).toBe(1)
        expect(api.createCable.mock.calls[0][0]).toBe('ws://url')
        expect(api.createCable.mock.calls[0][1]).toEqual({protocol: 'test'})
      })
    })
  })

  describe('subscribeTo', () => {
    describe('actioncable', () => {
      const port = {
        postMessage: jest.fn()
      }
      const wsInterface = {
        connect: jest.fn(),
        subscriptions: {
          create: jest.fn()
        }
      }
      const api = {
        createConsumer: () => wsInterface
      }
      const wrapper = initCableWrapper('actioncable', api)

      beforeEach(() => {
        wrapper.createCable('ws://url')
      })

      it('create subscription', () => {
        wrapper.subscribeTo({
          port,
          portID: 'some-id',
          id: 'another-id',
          channel: 'ChatChannel',
          params: {chatID: 42}
        })

        expect(wsInterface.subscriptions.create.mock.calls.length).toBe(1)
        expect(wsInterface.subscriptions.create.mock.calls[0][0]).toEqual({
          channel: 'ChatChannel',
          chatID: 42
        })
      })
    })

    describe('anycable', () => {
      const channelInterface = {
        on: jest.fn()
      }
      const wsInterface = {
        connect: jest.fn(),
        subscribeTo: jest.fn(() => new Promise((resolve) => resolve(channelInterface)))
      }
      const api = {
        createCable: () => wsInterface
      }
      const wrapper = initCableWrapper('anycable', api)

      beforeEach(() => {
        wrapper.createCable('ws://url')
      })

      it('create subscription', async () => {
        await wrapper.subscribeTo({
          port: {},
          portID: 'some-id',
          id: 'another-id',
          channel: 'ChatChannel',
          params: {chatID: 42}
        })

        expect(wsInterface.subscribeTo.mock.calls.length).toBe(1)
        expect(wsInterface.subscribeTo.mock.calls[0][0]).toEqual('ChatChannel')
        expect(wsInterface.subscribeTo.mock.calls[0][1]).toEqual({chatID: 42})
        expect(channelInterface.on.mock.calls.length).toBe(1)
        expect(channelInterface.on.mock.calls[0][0]).toEqual('message')
      })
    })
  })
})
