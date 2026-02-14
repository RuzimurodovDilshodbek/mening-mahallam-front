export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) {
    return
  }

  const auth = useAuth()

  if (!auth.token.value) {
    const savedToken = localStorage.getItem('auth_token')
    if (savedToken) {
      auth.setToken(savedToken)
    }
  }

  if (auth.token.value && !auth.user.value) {
    await auth.fetchUser()
  }

  if (!auth.isAuthenticated.value && to.path !== '/login') {
    return navigateTo('/login')
  }
})
