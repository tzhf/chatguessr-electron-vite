// import { ref, watch } from 'vue'

export function getLocalStorage<T>(initialValue: T, key: string): T {
  const storedVal = window.localStorage.getItem(key)

  if (storedVal) return JSON.parse(storedVal)

  return initialValue
}

export function setLocalStorage<T>(value: T, key: string) {
  window.localStorage.setItem(key, JSON.stringify(value))
}

// export default function <T>(initialValue: T, key: string) {
//   const val = ref(initialValue)

//   const storedVal = window.localStorage.getItem(key)
//   if (storedVal) {
//     val.value = JSON.parse(storedVal)
//   }

//   watch(
//     val,
//     (val) => {
//       window.localStorage.setItem(key, JSON.stringify(val))
//     },
//     { deep: true }
//   )

//   return val
// }
