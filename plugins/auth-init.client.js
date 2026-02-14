export default defineNuxtPlugin(async () => {
  const auth = useAuth()

  if (process.client && !auth.token.value) {
    const savedToken = localStorage.getItem('auth_token')
    if (savedToken) {
      auth.setToken(savedToken)
    }
  }

  if (auth.token.value && !auth.user.value) {
    await auth.fetchUser()
  }
})
