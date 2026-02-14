export const useAdminApi = () => {
  const { request } = useApi()

  const users = async () => await request('/api/admin/users')

  const createUser = async (payload) => await request('/api/admin/users', {
    method: 'POST',
    body: payload,
  })

  const updateUser = async (id, payload) => await request(`/api/admin/users/${id}`, {
    method: 'PUT',
    body: payload,
  })

  const deleteUser = async (id) => await request(`/api/admin/users/${id}`, {
    method: 'DELETE',
  })

  const neighborhoods = async () => await request('/api/admin/neighborhoods')

  const verifyNeighborhood = async (id) => await request(`/api/admin/neighborhoods/${id}/verify`, {
    method: 'POST',
  })

  return { users, createUser, updateUser, deleteUser, neighborhoods, verifyNeighborhood }
}
