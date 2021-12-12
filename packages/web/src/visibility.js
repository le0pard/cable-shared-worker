const getVisibilityPropertyNames = () => {
  if (typeof document.mozHidden !== 'undefined') {
    return ['mozVisibilityState', 'mozvisibilitychange']
  }

  if (typeof document.webkitHidden !== 'undefined') {
    return ['webkitVisibilityState', 'webkitvisibilitychange']
  }

  return ['visibilityState', 'visibilitychange']
}

const [visibilityState, visibilityChange] = getVisibilityPropertyNames()

const handleVisibilityChange = () => {
  if (document[visibilityState] === 'visible') {
    // nothing
  }
}

document.addEventListener(visibilityChange, handleVisibilityChange)

document.removeEventListener(visibilityChange, handleVisibilityChange)
