export const memoize = (fn) => {
  const cache = new Map()
  return (...args) => {
    const strX = JSON.stringify(args)
    const result = cache.get(strX)
    if (typeof result !== 'undefined') {
      return result
    }

    cache.set(
      strX,
      fn(...args).catch((err) => {
        cache.delete(strX)
        throw err
      })
    )
    return cache.get(strX)
  }
}
