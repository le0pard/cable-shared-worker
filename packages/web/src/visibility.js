let visibilityTimer = null

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

export const activateVisibilityAPI = ({timeout, visible, hidden}) => {
  const handleVisibility = () => {
    const isVisible = document[visibilityState] === 'visible'
    if (isVisible) {
      if (visibilityTimer) {
        clearTimeout(visibilityTimer)
        visibilityTimer = null
      }
      if (visible) {
        visible()
      }
    } else {
      visibilityTimer = setTimeout(() => {
        if (hidden) {
          hidden()
        }
        visibilityTimer = null
      }, timeout * 1000)
    }
  }

  document.addEventListener(visibilityChange, handleVisibility)
  return () => {
    document.removeEventListener(visibilityChange, handleVisibility)
  }
}
