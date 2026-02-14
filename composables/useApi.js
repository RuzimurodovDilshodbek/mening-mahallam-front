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

    return await $fetch(`${config.public.apiBase}${path}`, {
      ...options,
      headers,
    })
  }

  return { request }
}
