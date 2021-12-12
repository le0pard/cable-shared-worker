import {initActioncableAPI} from './cables/actioncable'
import {initAnycableAPI} from './cables/anycable'

export const loadCableApiWrapper = (cableType = 'actioncable', cableLibrary = null, options = {}, hooks = {}) => {
  if (!cableLibrary) {
    throw new Error('cableLibrary cannot be null')
  }

  switch (cableType?.toLowerCase()) {
    case 'actioncable': {
      return initActioncableAPI(cableLibrary, options, hooks)
    }
    case 'anycable': {
      return initAnycableAPI(cableLibrary, options, hooks)
    }
    default: {
      throw new Error(`${cableType} is not actioncable or anycable type`)
    }
  }
}
