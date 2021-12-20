import {
  addPortForStore,
  updatePortPongTime,
  recurrentPortsChecks,
  __getActivePorts,
  __resetActivePorts
} from '../workerPorts'

describe('alive ports logic', () => {
  let aliveTimer = null

  beforeEach(() => {
    jest.useFakeTimers()
    __resetActivePorts()
  })

  afterEach(() => {
    if (aliveTimer) {
      clearInterval(aliveTimer)
      aliveTimer = null
    }
    jest.useRealTimers()
  })

  it('generate id and save port', () => {
    const port = {
      postMessage: () => {}
    }
    const id = addPortForStore(port)

    const portsData = __getActivePorts()
    expect(portsData[id]).toBeDefined()
    expect(portsData[id].port).toBe(port)
    expect(portsData[id].pongResponseTime).toBeDefined()

    const aMinuteAgo = new Date(Date.now() - 1000 * 60)
    const aMinuteAhead = new Date(Date.now() + 1000 * 60)
    expect(portsData[id].pongResponseTime > aMinuteAgo).toBe(true)
    expect(portsData[id].pongResponseTime < aMinuteAhead).toBe(true)
  })

  it('generate id uniq ids', () => {
    const port = {
      postMessage: () => {}
    }
    const oneId = addPortForStore(port)
    const secondId = addPortForStore(port)

    expect(oneId).not.toEqual(secondId)

    const portsData = __getActivePorts()
    expect(portsData[oneId]).toBeDefined()
    expect(portsData[secondId]).toBeDefined()
  })

  it('remove dead port in 25 seconds', () => {
    const port = {
      postMessage: () => {}
    }

    const id = addPortForStore(port)
    aliveTimer = recurrentPortsChecks()

    jest.advanceTimersByTime(10000)

    expect(__getActivePorts()[id]).toBeDefined()

    jest.advanceTimersByTime(15000)

    expect(__getActivePorts()[id]).not.toBeDefined()
  })

  it('alive port need to stay in store', () => {
    const alivePort = {
      postMessage: () => {}
    }
    const deadPort = {
      postMessage: () => {}
    }
    const spy = jest.spyOn(alivePort, 'postMessage')

    const aliveId = addPortForStore(alivePort)
    const deadId = addPortForStore(deadPort)

    aliveTimer = recurrentPortsChecks()

    jest.advanceTimersByTime(10000)

    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenNthCalledWith(1, {command: 'CABLE_SW_PING'})
    expect(spy).toHaveBeenNthCalledWith(2, {command: 'CABLE_SW_PING'})
    expect(Object.keys(__getActivePorts()).length).toEqual(2)
    expect(__getActivePorts()[aliveId]).toBeDefined()
    expect(__getActivePorts()[deadId]).toBeDefined()

    updatePortPongTime(aliveId) // update port alive

    jest.clearAllMocks()

    jest.advanceTimersByTime(15000)

    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy).toHaveBeenNthCalledWith(1, {command: 'CABLE_SW_PING'})
    expect(spy).toHaveBeenNthCalledWith(2, {command: 'CABLE_SW_PING'})
    expect(spy).toHaveBeenNthCalledWith(3, {command: 'CABLE_SW_PING'})
    expect(Object.keys(__getActivePorts()).length).toEqual(1)
    expect(__getActivePorts()[aliveId]).toBeDefined()
    expect(__getActivePorts()[deadId]).not.toBeDefined()

    spy.mockRestore()
  })
})
