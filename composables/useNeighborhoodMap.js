export const useNeighborhoodMap = () => {
  const { request } = useApi()

  // POI Types
  const getPoiTypes = async () => await request('/api/poi-types')
  const createPoiType = async (name) => await request('/api/poi-types', {
    method: 'POST',
    body: { name },
  })

  // POIs
  const getPois = async (neighborhoodId) =>
    await request(`/api/neighborhoods/${neighborhoodId}/pois`)

  const createPoi = async (neighborhoodId, payload) =>
    await request(`/api/neighborhoods/${neighborhoodId}/pois`, {
      method: 'POST',
      body: payload,
    })

  const updatePoi = async (neighborhoodId, poiId, payload) =>
    await request(`/api/neighborhoods/${neighborhoodId}/pois/${poiId}`, {
      method: 'PUT',
      body: payload,
    })

  const deletePoi = async (neighborhoodId, poiId) =>
    await request(`/api/neighborhoods/${neighborhoodId}/pois/${poiId}`, {
      method: 'DELETE',
    })

  const uploadPoiImage = async (neighborhoodId, poiId, file, isPrimary = false) => {
    const formData = new FormData()
    formData.append('image', file)
    if (isPrimary) formData.append('is_primary', '1')

    return await request(`/api/neighborhoods/${neighborhoodId}/pois/${poiId}/images`, {
      method: 'POST',
      body: formData,
    })
  }

  const deletePoiImage = async (neighborhoodId, poiId, imageId) =>
    await request(`/api/neighborhoods/${neighborhoodId}/pois/${poiId}/images/${imageId}`, {
      method: 'DELETE',
    })

  const setPrimaryImage = async (neighborhoodId, poiId, imageId) =>
    await request(`/api/neighborhoods/${neighborhoodId}/pois/${poiId}/images/${imageId}/primary`, {
      method: 'PUT',
    })

  // Cameras
  const getCameras = async (neighborhoodId) =>
    await request(`/api/neighborhoods/${neighborhoodId}/cameras`)

  const createCamera = async (neighborhoodId, payload) =>
    await request(`/api/neighborhoods/${neighborhoodId}/cameras`, {
      method: 'POST',
      body: payload,
    })

  const updateCamera = async (neighborhoodId, cameraId, payload) =>
    await request(`/api/neighborhoods/${neighborhoodId}/cameras/${cameraId}`, {
      method: 'PUT',
      body: payload,
    })

  const deleteCamera = async (neighborhoodId, cameraId) =>
    await request(`/api/neighborhoods/${neighborhoodId}/cameras/${cameraId}`, {
      method: 'DELETE',
    })

  return {
    getPoiTypes, createPoiType,
    getPois, createPoi, updatePoi, deletePoi,
    uploadPoiImage, deletePoiImage, setPrimaryImage,
    getCameras, createCamera, updateCamera, deleteCamera,
  }
}
