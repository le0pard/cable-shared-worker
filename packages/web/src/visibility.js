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
  let visibilityTimer = null
  let isChannelsWasPaused = false

  const handleVisibility = () => {
    const isVisible = document[visibilityState] === 'visible'
    if (isVisible) {
      if (visibilityTimer) {
        clearTimeout(visibilityTimer)
        visibilityTimer = null
      }
      if (visible) {
        visible(isChannelsWasPaused)
      }
      isChannelsWasPaused = false
    } else {
      visibilityTimer = setTimeout(() => {
        isChannelsWasPaused = true
        if (hidden) {
          hidden(isChannelsWasPaused)
        }
        visibilityTimer = null
      }, timeout * 1000)
    }
  }

  document.addEventListener(visibilityChange, handleVisibility)
  return () => {
    if (visibilityTimer) {
      clearTimeout(visibilityTimer)
      visibilityTimer = null
    }
    isChannelsWasPaused = false
    document.removeEventListener(visibilityChange, handleVisibility)
  }
}
