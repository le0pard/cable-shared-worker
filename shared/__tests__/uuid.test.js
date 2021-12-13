import {uuid} from '../uuid'

describe('uuid', () => {
  it('generate string', () => {
    const result = uuid()
    expect(result).toEqual(expect.any(String))
    expect(result).toHaveLength(36)
  })

  it('should be uniq', () => {
    expect(uuid()).not.toEqual(uuid())
  })
})
