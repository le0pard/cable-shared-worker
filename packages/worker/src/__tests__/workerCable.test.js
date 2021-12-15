import {loadCableApiWrapper} from '../workerCable'

describe('loadCableApiWrapper', () => {
  it('throw error if no provided library', () => {
    expect(() => loadCableApiWrapper('actioncable', null)).toThrow('cableLibrary cannot be null')
  })

  it('throw error if not valid library type', () => {
    expect(() => loadCableApiWrapper('invalid', {})).toThrow(
      'invalid is not actioncable or anycable type'
    )
  })

  it('support valid types', () => {
    expect(() => loadCableApiWrapper('actioncable', {})).not.toThrow()
    expect(() => loadCableApiWrapper('anycable', {})).not.toThrow()
  })

  it('support type in different cases', () => {
    expect(() => loadCableApiWrapper('ActionCable', {})).not.toThrow()
    expect(() => loadCableApiWrapper('ANYCABLE', {})).not.toThrow()
  })
})
