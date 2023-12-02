import { ACTIONCABLE_TYPE, ANYCABLE_TYPE } from './../../../shared/constants'
import { initCableWrapper } from './cableWrapper'

export const loadCableApiWrapper = (
  cableType = ACTIONCABLE_TYPE,
  cableLibrary = null,
  options = {},
  hooks = {}
) => {
  if (!cableLibrary) {
    throw new Error('cableLibrary cannot be null')
  }

  switch (cableType?.toLowerCase()) {
    case ACTIONCABLE_TYPE:
    case ANYCABLE_TYPE: {
      return initCableWrapper(cableType.toLowerCase(), cableLibrary, options, hooks)
    }
    default: {
      throw new Error(`${cableType} is not actioncable or anycable type`)
    }
  }
}
