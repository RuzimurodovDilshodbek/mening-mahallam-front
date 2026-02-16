export const useApi = () => {
  const config = useRuntimeConfig()
  const auth = useAuth()

  const request = async (path, options = {}) => {
    const headers = {
      Accept: 'application/json',
      ...(options.headers || {}),
    }

    if (auth.token.value) {
      headers.Authorization = `Bearer ${auth.token.value}`
    }

    try {
      return await $fetch(`${config.public.apiBase}${path}`, {
        ...options,
        headers,
      })
    } catch (error) {
      if (error?.status === 401 || error?.response?.status === 401) {
        auth.setToken(null)
        auth.user.value = null

        if (process.client && window.location.pathname !== '/login') {
          await navigateTo('/login')
        }
      }
      throw error
    }
  }

  return { request }
}
