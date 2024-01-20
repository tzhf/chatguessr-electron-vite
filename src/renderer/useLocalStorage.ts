export function getLocalStorage<T>(key: string, initialValue: T): T {
  const storedVal = window.localStorage.getItem(key)

  if (storedVal) return JSON.parse(storedVal)

  return initialValue
}

export function setLocalStorage<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value))
}
