import {activateVisibilityAPI} from '../visibility'

const triggerVisibilityAPI = (isVisible = true) => {
  const visibleKey = isVisible ? 'visible' : 'hidden'
  Object.defineProperty(document, 'visibilityState', {value: visibleKey, writable: true})
  Object.defineProperty(document, 'hidden', {value: !isVisible, writable: true})
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('activateVisibilityAPI', () => {
  let disableVisibilityFn = null

  beforeEach(() => {
    jest.useFakeTimers()
    disableVisibilityFn = null
  })

  afterEach(() => {
    if (disableVisibilityFn) {
      disableVisibilityFn()
    }
    jest.useRealTimers()
  })

  it('not fail if no functions', () => {
    expect(() => {
      disableVisibilityFn = activateVisibilityAPI({
        timeout: 1
      })

      triggerVisibilityAPI(true)
      triggerVisibilityAPI(false)

      jest.advanceTimersByTime(1000) // call function hidden
    }).not.toThrow()
  })

  it('call visible', () => {
    const mockVisible = jest.fn()
    const mockHidden = jest.fn()

    disableVisibilityFn = activateVisibilityAPI({
      timeout: 1,
      visible: mockVisible
    })

    triggerVisibilityAPI(true)

    expect(mockVisible.mock.calls.length).toBe(1)
    expect(mockHidden.mock.calls.length).toBe(0)
  })

  it('call hidden and show', () => {
    const mockVisible = jest.fn()
    const mockHidden = jest.fn()

    disableVisibilityFn = activateVisibilityAPI({
      timeout: 5,
      visible: mockVisible,
      hidden: mockHidden
    })

    expect(mockHidden.mock.calls.length).toBe(0)
    expect(mockVisible.mock.calls.length).toBe(1) // initial setup

    triggerVisibilityAPI(false) // no changes

    expect(mockHidden.mock.calls.length).toBe(0)
    expect(mockVisible.mock.calls.length).toBe(1)

    jest.advanceTimersByTime(2000) // still not call function hidden

    expect(mockHidden.mock.calls.length).toBe(0)
    expect(mockVisible.mock.calls.length).toBe(1)

    jest.advanceTimersByTime(3000) // call function hidden

    expect(mockVisible.mock.calls.length).toBe(1)
    expect(mockHidden.mock.calls.length).toBe(1)
    expect(mockHidden.mock.calls[0][0]).toBe(true)

    triggerVisibilityAPI(true)

    expect(mockHidden.mock.calls.length).toBe(1) // still only prev call counted
    expect(mockVisible.mock.calls.length).toBe(2)
    expect(mockVisible.mock.calls[1][0]).toBe(true)
  })
})
