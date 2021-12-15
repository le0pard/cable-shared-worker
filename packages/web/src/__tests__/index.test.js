import {isWorkersAvailable, isSharedWorkerAvailable, isWebWorkerAvailable} from '../index'

describe('isWorkersAvailable', () => {
  it('false for node', () => {
    expect(isWorkersAvailable).toBe(false)
  })
})

describe('isSharedWorkerAvailable', () => {
  it('false for node', () => {
    expect(isSharedWorkerAvailable).toBe(false)
  })
})

describe('isWebWorkerAvailable', () => {
  it('false for node', () => {
    expect(isWebWorkerAvailable).toBe(false)
  })
})
