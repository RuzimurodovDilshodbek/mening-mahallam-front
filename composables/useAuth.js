export const useAuth = () => {
  const config = useRuntimeConfig()
  const token = useState('auth_token', () => null)
  const user = useState('auth_user', () => null)

  const isAuthenticated = computed(() => !!token.value)

  const setToken = (value) => {
    token.value = value

    if (process.client) {
      if (value) {
        localStorage.setItem('auth_token', value)
      } else {
        localStorage.removeItem('auth_token')
      }
    }
  }

  const login = async (email, password) => {
    const response = await $fetch(`${config.public.apiBase}/api/login`, {
      method: 'POST',
      body: { email, password },
      headers: { Accept: 'application/json' },
    })

    setToken(response.token)
    user.value = response.user
  }

  const fetchUser = async () => {
    if (!token.value) {
      user.value = null
      return
    }

    try {
      user.value = await $fetch(`${config.public.apiBase}/api/user`, {
        headers: {
          Authorization: `Bearer ${token.value}`,
          Accept: 'application/json',
        },
      })
    } catch {
      setToken(null)
      user.value = null
    }
  }

  const logout = async () => {
    if (token.value) {
      try {
        await $fetch(`${config.public.apiBase}/api/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token.value}`,
            Accept: 'application/json',
          },
        })
      } catch {
      }
    }

    setToken(null)
    user.value = null
  }

  return { token, user, isAuthenticated, login, logout, fetchUser, setToken }
}
