// import { supabase } from '../utils/useSupabase'

const startAuth: HTMLButtonElement | null = document.querySelector('#start-auth')
if (startAuth) {
  startAuth.addEventListener('click', () => {
    startAuth.disabled = true
    // supabase.auth.signOut().finally(() => {
    // @ts-expect-error TS2304: defined by preload script
    chatguessrApi.startAuth()
    // })
  })
}
