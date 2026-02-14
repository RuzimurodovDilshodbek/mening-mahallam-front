export const useNeighborhoods = () => {
  const { request } = useApi()

  const list = async () => await request('/api/neighborhoods')

  const one = async (id) => await request(`/api/neighborhoods/${id}`)

  const create = async (payload) => await request('/api/neighborhoods', {
    method: 'POST',
    body: payload,
  })

  const update = async (id, payload) => await request(`/api/neighborhoods/${id}`, {
    method: 'PUT',
    body: payload,
  })

  const remove = async (id) => await request(`/api/neighborhoods/${id}`, {
    method: 'DELETE',
  })

  const publish = async (id) => await request(`/api/neighborhoods/${id}/publish`, {
    method: 'POST',
  })

  return { list, one, create, update, remove, publish }
}
