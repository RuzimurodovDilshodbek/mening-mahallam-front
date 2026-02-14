<script setup>
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const config = useRuntimeConfig()
const { one, update } = useNeighborhoods()
const {
  getPois, createPoi, updatePoi, deletePoi,
  uploadPoiImage, deletePoiImage, setPrimaryImage,
  getCameras, createCamera, updateCamera, deleteCamera,
  getPoiTypes, createPoiType,
} = useNeighborhoodMap()

const neighborhoodId = route.params.id
const storageBase = `${config.public.apiBase}/storage/`

// State
const neighborhood = ref(null)
const pois = ref([])
const cameras = ref([])
const poiTypes = ref([])
const loading = ref(true)
const activeTab = ref('boundary')
const mapEl = ref(null)

// Map objects
let map = null
let L = null
let boundaryPolygon = null
let maskPolygon = null
let poiMarkersGroup = null
let cameraMarkersGroup = null
let currentTileLayer = null

// Map settings
const mapStyle = ref('osm')
const maskOpacity = ref(70)
const editingBoundary = ref(false)
const boundarySaving = ref(false)
const boundarySaved = ref(false)

// Print settings
const printSize = ref('a4-portrait')
const printSizeOptions = [
  { value: 'a4-portrait', label: 'A4 (портрет)' },
  { value: 'a4-landscape', label: 'A4 (альбом)' },
  { value: 'a3-portrait', label: 'A3 (портрет)' },
  { value: 'a3-landscape', label: 'A3 (альбом)' },
]

// World bounds for mask
const worldBounds = [[85, -180], [85, 180], [-85, 180], [-85, -180], [85, -180]]

// Tile layer configs
const tileLayers = {
  osm: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '&copy; OpenStreetMap', maxZoom: 19 },
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: '&copy; Esri', maxZoom: 19 },
  topo: { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attr: '&copy; OpenTopoMap', maxZoom: 17 },
}

// Modal state
const showPoiModal = ref(false)
const showCameraModal = ref(false)
const placingPoi = ref(false)
const placingCamera = ref(false)
const editingPoi = ref(null)
const editingCamera = ref(null)

const poiForm = reactive({
  name: '', poi_type_id: null, description: '', address: '', phone: '',
  latitude: null, longitude: null,
})

const cameraForm = reactive({
  name: '', description: '', status: 'active',
  latitude: null, longitude: null,
})

// POI type search
const poiTypeSearch = ref('')
const showPoiTypeDropdown = ref(false)

const filteredPoiTypes = computed(() => {
  if (!poiTypeSearch.value) return poiTypes.value
  const q = poiTypeSearch.value.toLowerCase()
  return poiTypes.value.filter(t => t.name.toLowerCase().includes(q))
})

const selectPoiType = (type) => {
  poiForm.poi_type_id = type.id
  poiTypeSearch.value = type.name
  showPoiTypeDropdown.value = false
}

const createNewPoiType = async () => {
  if (!poiTypeSearch.value.trim()) return
  try {
    const newType = await createPoiType(poiTypeSearch.value.trim())
    poiTypes.value.push(newType)
    poiForm.poi_type_id = newType.id
    showPoiTypeDropdown.value = false
  } catch { /* */ }
}

// Load data
const loadData = async () => {
  loading.value = true
  try {
    const [nRes, poisRes, camerasRes, typesRes] = await Promise.all([
      one(neighborhoodId),
      getPois(neighborhoodId),
      getCameras(neighborhoodId),
      getPoiTypes(),
    ])
    neighborhood.value = nRes.data
    pois.value = poisRes
    cameras.value = camerasRes
    poiTypes.value = typesRes
  } catch (e) {
    console.error('Load error', e)
  } finally {
    loading.value = false
  }
}

// Boundary
const boundaryCoords = ref([])
const pointCount = computed(() => boundaryCoords.value.length)

const updateMask = () => {
  if (!map || !L) return
  if (maskPolygon) map.removeLayer(maskPolygon)

  if (boundaryCoords.value.length >= 3) {
    maskPolygon = L.polygon([worldBounds, boundaryCoords.value.slice().reverse()], {
      color: 'transparent',
      fillColor: '#000000',
      fillOpacity: maskOpacity.value / 100,
      interactive: false,
    }).addTo(map)
  }
}

const enableBoundaryEdit = () => {
  if (!boundaryPolygon || editingBoundary.value) return
  editingBoundary.value = true
  boundaryPolygon.editing.enable()
  boundaryPolygon.setStyle({ weight: 4, color: '#22c55e', dashArray: '8, 4' })
}

const disableBoundaryEdit = () => {
  if (!boundaryPolygon || !editingBoundary.value) return
  editingBoundary.value = false
  boundaryPolygon.editing.disable()
  boundaryPolygon.setStyle({ weight: 3, color: '#6366f1', dashArray: null })
  syncBoundaryFromPolygon()
}

const syncBoundaryFromPolygon = () => {
  if (!boundaryPolygon) return
  const latlngs = boundaryPolygon.getLatLngs()[0] || []
  boundaryCoords.value = latlngs.map(p => [Number(p.lat.toFixed(7)), Number(p.lng.toFixed(7))])
  updateMask()
}

const saveBoundary = async () => {
  if (boundaryCoords.value.length < 3) return
  boundarySaving.value = true
  try {
    disableBoundaryEdit()
    await update(neighborhoodId, { boundary_coordinates: boundaryCoords.value })
    neighborhood.value.boundary_coordinates = boundaryCoords.value
    boundarySaved.value = true
    setTimeout(() => { boundarySaved.value = false }, 3000)
  } catch { /* */ }
  finally { boundarySaving.value = false }
}

const fitBounds = () => {
  if (boundaryPolygon && map) {
    map.fitBounds(boundaryPolygon.getBounds(), { padding: [50, 50] })
  }
}

const drawNewBoundary = () => {
  if (!map || !L) return
  // Remove existing
  if (boundaryPolygon) {
    if (editingBoundary.value) boundaryPolygon.editing.disable()
    map.removeLayer(boundaryPolygon)
    boundaryPolygon = null
  }
  if (maskPolygon) { map.removeLayer(maskPolygon); maskPolygon = null }
  boundaryCoords.value = []

  // Start draw mode
  const drawHandler = new L.Draw.Polygon(map, {
    allowIntersection: false,
    showArea: true,
    shapeOptions: { color: '#6366f1', weight: 3, fillColor: '#6366f1', fillOpacity: 0.1 },
  })
  drawHandler.enable()
}

// Switch map style
const switchMapStyle = (style) => {
  if (!map || !L) return
  mapStyle.value = style
  if (currentTileLayer) map.removeLayer(currentTileLayer)
  const cfg = tileLayers[style]
  currentTileLayer = L.tileLayer(cfg.url, { attribution: cfg.attr, maxZoom: cfg.maxZoom }).addTo(map)
  if (maskPolygon) maskPolygon.bringToFront()
  if (boundaryPolygon) boundaryPolygon.bringToFront()
}

// Watch mask opacity
watch(maskOpacity, () => {
  if (maskPolygon) maskPolygon.setStyle({ fillOpacity: maskOpacity.value / 100 })
})

// POI CRUD
const startAddPoi = () => { placingPoi.value = true; activeTab.value = 'pois' }

const openPoiForm = (lat, lng) => {
  resetPoiForm()
  poiForm.latitude = lat; poiForm.longitude = lng
  showPoiModal.value = true; placingPoi.value = false
}

const editPoi = (poi) => {
  editingPoi.value = poi
  poiForm.name = poi.name; poiForm.poi_type_id = poi.poi_type_id
  poiForm.description = poi.description || ''; poiForm.address = poi.address || ''
  poiForm.phone = poi.phone || ''; poiForm.latitude = poi.latitude; poiForm.longitude = poi.longitude
  poiTypeSearch.value = poi.poi_type?.name || ''
  showPoiModal.value = true
}

const savePoi = async () => {
  if (!poiForm.name) return
  try {
    if (editingPoi.value) {
      const updated = await updatePoi(neighborhoodId, editingPoi.value.id, { ...poiForm })
      const idx = pois.value.findIndex(p => p.id === editingPoi.value.id)
      if (idx >= 0) pois.value[idx] = updated
    } else {
      const created = await createPoi(neighborhoodId, { ...poiForm })
      pois.value.push(created)
    }
    showPoiModal.value = false; resetPoiForm(); renderPoiMarkers()
  } catch { /* */ }
}

const removePoi = async (poi) => {
  if (!confirm(`"${poi.name}" ni o'chirishni xohlaysizmi?`)) return
  try {
    await deletePoi(neighborhoodId, poi.id)
    pois.value = pois.value.filter(p => p.id !== poi.id)
    renderPoiMarkers()
  } catch { /* */ }
}

const resetPoiForm = () => {
  Object.assign(poiForm, { name: '', poi_type_id: null, description: '', address: '', phone: '', latitude: null, longitude: null })
  poiTypeSearch.value = ''; editingPoi.value = null
}

// Camera CRUD
const startAddCamera = () => { placingCamera.value = true; activeTab.value = 'cameras' }

const openCameraForm = (lat, lng) => {
  resetCameraForm()
  cameraForm.latitude = lat; cameraForm.longitude = lng
  showCameraModal.value = true; placingCamera.value = false
}

const editCameraItem = (camera) => {
  editingCamera.value = camera
  cameraForm.name = camera.name; cameraForm.description = camera.description || ''
  cameraForm.status = camera.status || 'active'
  cameraForm.latitude = camera.latitude; cameraForm.longitude = camera.longitude
  showCameraModal.value = true
}

const saveCamera = async () => {
  if (!cameraForm.name) return
  try {
    if (editingCamera.value) {
      const updated = await updateCamera(neighborhoodId, editingCamera.value.id, { ...cameraForm })
      const idx = cameras.value.findIndex(c => c.id === editingCamera.value.id)
      if (idx >= 0) cameras.value[idx] = updated
    } else {
      const created = await createCamera(neighborhoodId, { ...cameraForm })
      cameras.value.push(created)
    }
    showCameraModal.value = false; resetCameraForm(); renderCameraMarkers()
  } catch { /* */ }
}

const removeCamera = async (camera) => {
  if (!confirm(`"${camera.name}" ni o'chirishni xohlaysizmi?`)) return
  try {
    await deleteCamera(neighborhoodId, camera.id)
    cameras.value = cameras.value.filter(c => c.id !== camera.id)
    renderCameraMarkers()
  } catch { /* */ }
}

const resetCameraForm = () => {
  Object.assign(cameraForm, { name: '', description: '', status: 'active', latitude: null, longitude: null })
  editingCamera.value = null
}

// Image upload
const poiImageInput = ref(null)
const uploadingImage = ref(false)
const imageUploadPoiId = ref(null)

const triggerImageUpload = (poiId) => { imageUploadPoiId.value = poiId; poiImageInput.value?.click() }

const handleImageUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file || !imageUploadPoiId.value) return
  uploadingImage.value = true
  try {
    const image = await uploadPoiImage(neighborhoodId, imageUploadPoiId.value, file)
    const poi = pois.value.find(p => p.id === imageUploadPoiId.value)
    if (poi) { if (!poi.images) poi.images = []; poi.images.push(image) }
    renderPoiMarkers()
  } catch { /* */ }
  finally { uploadingImage.value = false; imageUploadPoiId.value = null; event.target.value = '' }
}

// Render markers
const renderPoiMarkers = () => {
  if (!map || !L || !poiMarkersGroup) return
  poiMarkersGroup.clearLayers()

  pois.value.forEach(poi => {
    const primaryImg = poi.images?.find(img => img.is_primary) || poi.images?.[0]
    let iconHtml
    if (primaryImg) {
      iconHtml = `<div style="width:40px;height:40px;border-radius:50%;border:3px solid #6366f1;overflow:hidden;background:#fff;">
        <img src="${storageBase}${primaryImg.path}" style="width:100%;height:100%;object-fit:cover;" /></div>`
    } else {
      iconHtml = `<div style="width:40px;height:40px;border-radius:50%;border:3px solid #6366f1;background:#eef2ff;display:flex;align-items:center;justify-content:center;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg></div>`
    }

    const icon = L.divIcon({ html: iconHtml, className: 'poi-marker', iconSize: [40, 40], iconAnchor: [20, 20] })
    const marker = L.marker([poi.latitude, poi.longitude], { icon })
    const typeName = poi.poi_type?.name || poi.type || ''
    marker.bindPopup(`<div style="min-width:180px;"><strong>${poi.name}</strong>
      ${typeName ? `<br><span style="color:#6366f1;font-size:12px;">${typeName}</span>` : ''}
      ${poi.description ? `<br><span style="font-size:12px;color:#666;">${poi.description}</span>` : ''}
      <br><a href="/dashboard/neighborhoods/${neighborhoodId}/poi/${poi.id}" style="color:#6366f1;font-size:12px;">Batafsil &rarr;</a></div>`)
    poiMarkersGroup.addLayer(marker)
  })
}

const renderCameraMarkers = () => {
  if (!map || !L || !cameraMarkersGroup) return
  cameraMarkersGroup.clearLayers()

  cameras.value.forEach(camera => {
    const statusColor = camera.status === 'active' ? '#3b82f6' : camera.status === 'maintenance' ? '#f59e0b' : '#9ca3af'
    const iconHtml = `<div style="width:36px;height:36px;border-radius:50%;border:3px solid ${statusColor};background:#fff;display:flex;align-items:center;justify-content:center;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${statusColor}" stroke-width="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg></div>`

    const icon = L.divIcon({ html: iconHtml, className: 'camera-marker', iconSize: [36, 36], iconAnchor: [18, 18] })
    const marker = L.marker([camera.latitude, camera.longitude], { icon })
    marker.bindPopup(`<div style="min-width:150px;"><strong>${camera.name}</strong>
      <br><span style="font-size:12px;color:${statusColor};">${camera.status}</span>
      ${camera.description ? `<br><span style="font-size:12px;color:#666;">${camera.description}</span>` : ''}</div>`)
    cameraMarkersGroup.addLayer(marker)
  })
}

// Init map
onMounted(async () => {
  await loadData()
  if (!process.client) return

  const leaflet = await import('leaflet')
  await import('leaflet-draw')
  L = leaflet.default || leaflet

  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })

  const center = neighborhood.value?.center
  map = L.map(mapEl.value, { minZoom: 10, maxZoom: 19 }).setView(
    center ? [center.lat, center.lng] : [40.171093, 64.927777], 14
  )

  // Default tile layer
  const cfg = tileLayers.osm
  currentTileLayer = L.tileLayer(cfg.url, { attribution: cfg.attr, maxZoom: cfg.maxZoom }).addTo(map)

  // Boundary polygon
  if (neighborhood.value?.boundary_coordinates?.length) {
    boundaryCoords.value = neighborhood.value.boundary_coordinates
    boundaryPolygon = L.polygon(boundaryCoords.value, {
      color: '#6366f1', weight: 3, fillColor: '#6366f1', fillOpacity: 0.08,
    }).addTo(map)

    // Listen for edit events
    boundaryPolygon.on('edit', syncBoundaryFromPolygon)

    // Mask
    updateMask()

    map.fitBounds(boundaryPolygon.getBounds(), { padding: [50, 50] })
  }

  // Leaflet Draw for creating NEW polygons only
  map.on(L.Draw.Event.CREATED, (event) => {
    if (boundaryPolygon) map.removeLayer(boundaryPolygon)
    boundaryPolygon = event.layer
    boundaryPolygon.setStyle({ color: '#6366f1', weight: 3, fillColor: '#6366f1', fillOpacity: 0.08 })
    boundaryPolygon.addTo(map)
    boundaryPolygon.on('edit', syncBoundaryFromPolygon)
    syncBoundaryFromPolygon()
  })

  L.control.scale({ imperial: false, metric: true, position: 'bottomleft' }).addTo(map)

  // POI & Camera layers
  poiMarkersGroup = new L.FeatureGroup().addTo(map)
  cameraMarkersGroup = new L.FeatureGroup().addTo(map)

  renderPoiMarkers()
  renderCameraMarkers()

  // Click handler for placing markers
  map.on('click', (e) => {
    if (placingPoi.value) openPoiForm(e.latlng.lat, e.latlng.lng)
    else if (placingCamera.value) openCameraForm(e.latlng.lat, e.latlng.lng)
  })

  setTimeout(() => map.invalidateSize(), 200)
})

const focusPoi = (poi) => { if (map) map.setView([poi.latitude, poi.longitude], 17) }
const focusCamera = (camera) => { if (map) map.setView([camera.latitude, camera.longitude], 17) }

let printNumberMarkers = []

const printNeighborhood = () => {
  if (!map || !L) { window.print(); return }

  // Set page size CSS variable
  document.documentElement.setAttribute('data-print-size', printSize.value)

  // Fit boundary in view
  if (boundaryPolygon) {
    map.fitBounds(boundaryPolygon.getBounds(), { padding: [30, 30] })
  }

  // Add numbered labels to POI markers
  pois.value.forEach((poi, i) => {
    const label = L.marker([poi.latitude, poi.longitude], {
      icon: L.divIcon({
        html: `<div class="print-number-label print-number-poi">${i + 1}</div>`,
        className: 'print-number-icon',
        iconSize: [22, 22],
        iconAnchor: [11, -8],
      }),
      interactive: false,
    }).addTo(map)
    printNumberMarkers.push(label)
  })

  // Add numbered labels to camera markers
  cameras.value.forEach((camera, i) => {
    const label = L.marker([camera.latitude, camera.longitude], {
      icon: L.divIcon({
        html: `<div class="print-number-label print-number-camera">K${i + 1}</div>`,
        className: 'print-number-icon',
        iconSize: [26, 22],
        iconAnchor: [13, -8],
      }),
      interactive: false,
    }).addTo(map)
    printNumberMarkers.push(label)
  })

  map.invalidateSize()

  setTimeout(() => {
    window.print()

    // Remove numbered labels
    printNumberMarkers.forEach(m => map.removeLayer(m))
    printNumberMarkers = []

    document.documentElement.removeAttribute('data-print-size')
  }, 600)
}

const printDate = computed(() => {
  const d = new Date()
  return d.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' })
})

const statusColors = {
  active: 'text-emerald-600 bg-emerald-50',
  inactive: 'text-gray-600 bg-gray-100',
  maintenance: 'text-amber-600 bg-amber-50',
}
</script>

<template>
  <div class="h-[calc(100vh-5rem)] flex flex-col -m-6 print-layout">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 no-print">
      <div class="flex items-center gap-3">
        <NuxtLink :to="`/dashboard/neighborhoods/${neighborhoodId}`" class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        </NuxtLink>
        <div>
          <h1 class="text-lg font-bold text-gray-900">
            {{ neighborhood?.name || 'Yuklanmoqda...' }}
            <span v-if="editingBoundary" class="ml-2 inline-block px-2.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-semibold animate-pulse">TAHRIRLASH REJIMI</span>
          </h1>
          <p class="text-xs text-gray-500">Xaritani tahrirlash</p>
        </div>
      </div>
      <div class="flex items-center gap-2 text-sm">
        <select v-model="printSize" class="px-2 py-1 rounded-lg border border-gray-300 text-gray-700 text-xs font-medium focus:outline-none focus:border-indigo-500">
          <option v-for="opt in printSizeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <button class="px-3 py-1 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center gap-1.5" @click="printNeighborhood">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
          Chop etish
        </button>
        <span class="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 font-medium">{{ pois.length }} ta obyekt</span>
        <span class="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">{{ cameras.length }} ta kamera</span>
      </div>
    </div>

    <!-- Print-only header -->
    <div class="print-only-header">
      <div class="print-header-top">
        <div>
          <h1 class="print-title">{{ neighborhood?.name }}</h1>
          <p class="print-subtitle" v-if="neighborhood?.region || neighborhood?.district || neighborhood?.city">
            {{ [neighborhood?.region, neighborhood?.district, neighborhood?.city].filter(Boolean).join(', ') }}
          </p>
        </div>
        <div class="print-header-date">{{ printDate }}</div>
      </div>
      <div class="print-stats">
        <span>Chegaraviy nuqtalar: <strong>{{ pointCount }}</strong></span>
        <span>Obyektlar: <strong>{{ pois.length }}</strong></span>
        <span>Kameralar: <strong>{{ cameras.length }}</strong></span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full" />
    </div>

    <!-- Main content -->
    <div v-else class="flex-1 flex overflow-hidden">
      <!-- Sidebar -->
      <div class="w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden flex-shrink-0 print-sidebar">
        <!-- Tabs -->
        <div class="flex border-b border-gray-200 no-print">
          <button
            v-for="tab in [
              { key: 'boundary', label: 'Chegara' },
              { key: 'pois', label: 'Obyektlar' },
              { key: 'cameras', label: 'Kameralar' },
            ]"
            :key="tab.key"
            @click="activeTab = tab.key; placingPoi = false; placingCamera = false"
            class="flex-1 px-3 py-3 text-sm font-medium text-center transition-colors"
            :class="activeTab === tab.key ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:text-gray-700'"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Tab content -->
        <div class="flex-1 overflow-y-auto p-4">

          <!-- ===== BOUNDARY TAB ===== -->
          <div v-if="activeTab === 'boundary'" class="space-y-4">
            <!-- Instructions -->
            <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 space-y-1">
              <p class="font-semibold text-sm">Qanday tahrirlash:</p>
              <ul class="ml-4 list-disc space-y-0.5">
                <li><strong>Sudrang:</strong> Nuqtalarni sichqoncha bilan sudrang</li>
                <li><strong>Qo'shish:</strong> Chiziq o'rtasidagi kichik kvadratni bosing</li>
              </ul>
            </div>

            <!-- Edit toggle buttons -->
            <div class="space-y-2">
              <button
                v-if="!editingBoundary && boundaryCoords.length >= 3"
                @click="enableBoundaryEdit"
                class="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold text-sm shadow-lg hover:shadow-xl transition-all"
              >
                Tahrirlashni boshlash
              </button>
              <button
                v-if="editingBoundary"
                @click="disableBoundaryEdit"
                class="w-full px-4 py-2.5 rounded-xl bg-gray-600 text-white font-semibold text-sm hover:bg-gray-700 transition-all"
              >
                Tahrirlashni to'xtatish
              </button>
              <button
                v-if="!boundaryCoords.length"
                @click="drawNewBoundary"
                class="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow-lg hover:shadow-xl transition-all"
              >
                Yangi chegara chizish
              </button>
            </div>

            <!-- Map style -->
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">Xarita turi</label>
              <div class="grid grid-cols-3 gap-1.5">
                <button
                  v-for="s in [{ key: 'osm', label: 'Oddiy' }, { key: 'satellite', label: 'Sun\'iy yo\'ldosh' }, { key: 'topo', label: 'Topografik' }]"
                  :key="s.key"
                  @click="switchMapStyle(s.key)"
                  class="px-2 py-2 rounded-lg text-xs font-medium transition-all"
                  :class="mapStyle === s.key ? 'bg-indigo-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                >
                  {{ s.label }}
                </button>
              </div>
            </div>

            <!-- Mask opacity -->
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">
                Atrofni xiralashtirish: <span class="text-indigo-600">{{ maskOpacity }}%</span>
              </label>
              <input
                v-model="maskOpacity"
                type="range" min="0" max="100" step="5"
                class="w-full h-1.5 rounded-full appearance-none bg-gray-200 accent-indigo-600 cursor-pointer"
              />
            </div>

            <!-- Stats -->
            <div v-if="pointCount >= 3" class="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-3 text-center space-y-1">
              <p class="text-xs font-semibold text-gray-600">Statistika</p>
              <p class="text-sm text-gray-800">Nuqtalar: <strong class="text-indigo-600">{{ pointCount }}</strong> ta</p>
            </div>

            <!-- Actions -->
            <div class="space-y-2">
              <button
                @click="saveBoundary"
                :disabled="boundarySaving || pointCount < 3"
                class="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/30 hover:shadow-xl transition-all disabled:opacity-50"
              >
                {{ boundarySaving ? 'Saqlanmoqda...' : 'Chegarani saqlash' }}
              </button>
              <button @click="fitBounds" class="w-full px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors">
                Chegarani to'liq ko'rish
              </button>
            </div>

            <!-- Saved message -->
            <div v-if="boundarySaved" class="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-xl text-sm flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
              Saqlandi!
            </div>

            <!-- Coordinate display -->
            <div v-if="boundaryCoords.length" class="mt-2">
              <p class="text-xs font-semibold text-gray-600 mb-1">Koordinatalar:</p>
              <div class="bg-gray-50 border border-gray-200 rounded-lg p-2 max-h-40 overflow-y-auto font-mono text-[10px] text-gray-600 space-y-0.5">
                <div v-for="(coord, i) in boundaryCoords" :key="i">
                  {{ i + 1 }}. [{{ coord[0].toFixed(6) }}, {{ coord[1].toFixed(6) }}]
                </div>
              </div>
            </div>
          </div>

          <!-- ===== POIS TAB ===== -->
          <div v-if="activeTab === 'pois'" class="space-y-3">
            <button
              @click="startAddPoi"
              class="w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              :class="placingPoi ? 'bg-amber-50 text-amber-700 border-2 border-amber-300' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl'"
            >
              {{ placingPoi ? 'Xaritada joyni bosing...' : '+ Obyekt qo\'shish' }}
            </button>

            <div v-if="placingPoi" class="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              Xaritada kerakli joyni bosing. Bekor qilish uchun boshqa tabni bosing.
            </div>

            <div v-for="poi in pois" :key="poi.id" class="bg-gray-50 rounded-xl p-3 space-y-2">
              <div class="flex items-start justify-between">
                <div class="cursor-pointer" @click="focusPoi(poi)">
                  <div class="font-medium text-sm text-gray-900">{{ poi.name }}</div>
                  <div class="text-xs text-indigo-600">{{ poi.poi_type?.name || poi.type || '' }}</div>
                </div>
                <div class="flex items-center gap-1">
                  <button @click="triggerImageUpload(poi.id)" class="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors" title="Rasm yuklash">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </button>
                  <button @click="editPoi(poi)" class="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors" title="Tahrirlash">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button @click="removePoi(poi)" class="p-1.5 rounded-lg text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors" title="O'chirish">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
              <div v-if="poi.images?.length" class="flex gap-1.5 overflow-x-auto">
                <div v-for="img in poi.images" :key="img.id" class="relative flex-shrink-0">
                  <img :src="storageBase + img.path" class="w-10 h-10 rounded-lg object-cover" :class="img.is_primary ? 'ring-2 ring-indigo-500' : ''" />
                </div>
              </div>
              <NuxtLink :to="`/dashboard/neighborhoods/${neighborhoodId}/poi/${poi.id}`" class="text-xs text-indigo-600 hover:underline">Batafsil &rarr;</NuxtLink>
            </div>

            <div v-if="!pois.length" class="text-center text-sm text-gray-400 py-6">Hali obyekt qo'shilmagan</div>
          </div>

          <!-- ===== CAMERAS TAB ===== -->
          <div v-if="activeTab === 'cameras'" class="space-y-3">
            <button
              @click="startAddCamera"
              class="w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              :class="placingCamera ? 'bg-amber-50 text-amber-700 border-2 border-amber-300' : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl'"
            >
              {{ placingCamera ? 'Xaritada joyni bosing...' : '+ Kamera qo\'shish' }}
            </button>

            <div v-if="placingCamera" class="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              Xaritada kamera joyini bosing. Bekor qilish uchun boshqa tabni bosing.
            </div>

            <div v-for="camera in cameras" :key="camera.id" class="bg-gray-50 rounded-xl p-3">
              <div class="flex items-center justify-between">
                <div class="cursor-pointer" @click="focusCamera(camera)">
                  <div class="font-medium text-sm text-gray-900">{{ camera.name }}</div>
                  <span class="text-xs px-2 py-0.5 rounded-full font-medium" :class="statusColors[camera.status] || 'text-gray-500'">
                    {{ camera.status }}
                  </span>
                </div>
                <div class="flex items-center gap-1">
                  <button @click="editCameraItem(camera)" class="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button @click="removeCamera(camera)" class="p-1.5 rounded-lg text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            </div>

            <div v-if="!cameras.length" class="text-center text-sm text-gray-400 py-6">Hali kamera qo'shilmagan</div>
          </div>

          <!-- Print-only legend is now outside sidebar -->
        </div>
      </div>

      <!-- Map -->
      <div class="flex-1 relative print-map-wrap">
        <div ref="mapEl" class="w-full h-full print-map" />

        <!-- Placing indicator -->
        <div v-if="placingPoi || placingCamera" class="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-amber-500 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium">
          {{ placingPoi ? 'Obyekt joylashuvini tanlang' : 'Kamera joylashuvini tanlang' }}
        </div>
      </div>
    </div>

    <!-- Print-only legend -->
    <div class="print-legend">
      <div class="print-legend-grid">
        <div v-if="pois.length">
          <h3 class="print-legend-title">Obyektlar</h3>
          <table class="print-table">
            <thead>
              <tr><th>#</th><th>Nomi</th><th>Turi</th><th>Manzil</th><th>Koordinatalar</th></tr>
            </thead>
            <tbody>
              <tr v-for="(poi, i) in pois" :key="`pl-${poi.id}`">
                <td class="print-num-cell"><span class="print-num-badge print-num-poi">{{ i + 1 }}</span></td>
                <td>{{ poi.name }}</td>
                <td>{{ poi.poi_type?.name || poi.type || '—' }}</td>
                <td>{{ poi.address || '—' }}</td>
                <td class="print-coord">{{ Number(poi.latitude).toFixed(6) }}, {{ Number(poi.longitude).toFixed(6) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="cameras.length">
          <h3 class="print-legend-title">Kameralar</h3>
          <table class="print-table">
            <thead>
              <tr><th>#</th><th>Nomi</th><th>Status</th><th>Koordinatalar</th></tr>
            </thead>
            <tbody>
              <tr v-for="(camera, i) in cameras" :key="`cl-${camera.id}`">
                <td class="print-num-cell"><span class="print-num-badge print-num-camera">K{{ i + 1 }}</span></td>
                <td>{{ camera.name }}</td>
                <td>{{ camera.status === 'active' ? 'Faol' : camera.status === 'maintenance' ? 'Ta\'mirda' : 'Nofaol' }}</td>
                <td class="print-coord">{{ Number(camera.latitude).toFixed(6) }}, {{ Number(camera.longitude).toFixed(6) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Hidden image input -->
    <input ref="poiImageInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="handleImageUpload" />

    <!-- POI Modal -->
    <Teleport to="body">
      <div v-if="showPoiModal" class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40" @click.self="showPoiModal = false; resetPoiForm()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-4">
          <h3 class="text-lg font-bold text-gray-900">{{ editingPoi ? 'Obyektni tahrirlash' : 'Yangi obyekt' }}</h3>

          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nomi <span class="text-red-500">*</span></label>
              <input v-model="poiForm.name" type="text" class="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" placeholder="Obyekt nomi" />
            </div>

            <div class="relative">
              <label class="block text-sm font-medium text-gray-700 mb-1">Turi</label>
              <input
                v-model="poiTypeSearch" type="text"
                class="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                placeholder="Turni qidiring yoki yangi yarating..."
                @focus="showPoiTypeDropdown = true" @input="poiForm.poi_type_id = null"
              />
              <div v-if="showPoiTypeDropdown" class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                <button v-for="type in filteredPoiTypes" :key="type.id" @click="selectPoiType(type)" class="w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                  {{ type.name }}
                </button>
                <button
                  v-if="poiTypeSearch.trim() && !filteredPoiTypes.find(t => t.name.toLowerCase() === poiTypeSearch.toLowerCase())"
                  @click="createNewPoiType"
                  class="w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 border-t border-gray-100"
                >
                  + "{{ poiTypeSearch.trim() }}" turini yaratish
                </button>
                <div v-if="!filteredPoiTypes.length && !poiTypeSearch.trim()" class="px-4 py-2 text-sm text-gray-400">Turlar topilmadi</div>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tavsif</label>
              <textarea v-model="poiForm.description" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none" placeholder="Qisqacha tavsif..." />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Manzil</label>
                <input v-model="poiForm.address" type="text" class="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" placeholder="Ko'cha, uy" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input v-model="poiForm.phone" type="text" class="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" placeholder="+998..." />
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-2">
            <button @click="showPoiModal = false; resetPoiForm()" class="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">Bekor qilish</button>
            <button @click="savePoi" class="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/30 hover:shadow-xl transition-all">Saqlash</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Camera Modal -->
    <Teleport to="body">
      <div v-if="showCameraModal" class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40" @click.self="showCameraModal = false; resetCameraForm()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-4">
          <h3 class="text-lg font-bold text-gray-900">{{ editingCamera ? 'Kamerani tahrirlash' : 'Yangi kamera' }}</h3>

          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nomi <span class="text-red-500">*</span></label>
              <input v-model="cameraForm.name" type="text" class="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" placeholder="Kamera nomi" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tavsif</label>
              <textarea v-model="cameraForm.description" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none" placeholder="Kamera haqida..." />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select v-model="cameraForm.status" class="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all">
                <option value="active">Faol</option>
                <option value="inactive">Nofaol</option>
                <option value="maintenance">Ta'mirda</option>
              </select>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-2">
            <button @click="showCameraModal = false; resetCameraForm()" class="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">Bekor qilish</button>
            <button @click="saveCamera" class="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold text-sm shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all">Saqlash</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style>
.poi-marker, .camera-marker {
  background: transparent !important;
  border: none !important;
}

.print-only-header,
.print-legend {
  display: none;
}

/* Print number labels (visible on screen too during print prep, but styled for print) */
.print-number-icon {
  background: transparent !important;
  border: none !important;
}
.print-number-label {
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  border-radius: 3px;
  padding: 1px 4px;
  text-align: center;
  line-height: 18px;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0,0,0,0.4);
}
.print-number-poi { background: #6366f1; }
.print-number-camera { background: #3b82f6; }

@media print {
  /* Page size based on data attribute */
  @page { margin: 8mm; }

  /* Hide interactive elements */
  .no-print,
  .print-sidebar,
  .fixed.inset-0.z-\[2000\] {
    display: none !important;
  }

  /* Show print-only sections */
  .print-only-header,
  .print-legend {
    display: block !important;
  }

  /* Layout */
  .print-layout {
    height: auto !important;
    margin: 0 !important;
    display: block !important;
    overflow: visible !important;
  }

  .print-layout > .flex-1.flex.overflow-hidden {
    display: block !important;
    overflow: visible !important;
  }

  /* Map fills full width */
  .print-map-wrap {
    width: 100% !important;
    height: 500px !important;
    min-height: 500px !important;
    page-break-inside: avoid;
  }
  .print-map {
    width: 100% !important;
    height: 500px !important;
    min-height: 500px !important;
  }

  /* Force print backgrounds and images */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }

  /* Leaflet tile images */
  .leaflet-tile-container img {
    visibility: visible !important;
  }
  .leaflet-tile-pane {
    opacity: 1 !important;
  }

  /* Keep scale control visible, hide others */
  .leaflet-control-container .leaflet-control-zoom,
  .leaflet-control-container .leaflet-control-attribution,
  .leaflet-draw {
    display: none !important;
  }
  .leaflet-control-scale {
    display: block !important;
  }

  /* Placing indicator */
  .absolute.top-4 {
    display: none !important;
  }

  /* Print header */
  .print-only-header {
    padding: 12px 0;
    border-bottom: 2px solid #4f46e5;
    margin-bottom: 8px;
  }
  .print-header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .print-title {
    font-size: 20px;
    font-weight: 800;
    color: #1f2937;
    margin: 0;
  }
  .print-subtitle {
    font-size: 12px;
    color: #6b7280;
    margin: 2px 0 0 0;
  }
  .print-header-date {
    font-size: 11px;
    color: #9ca3af;
    white-space: nowrap;
  }
  .print-stats {
    display: flex;
    gap: 20px;
    margin-top: 6px;
    font-size: 11px;
    color: #6b7280;
  }
  .print-stats strong {
    color: #4f46e5;
  }

  /* Print legend */
  .print-legend {
    page-break-before: auto;
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px solid #e5e7eb;
  }
  .print-legend-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .print-legend-title {
    font-size: 13px;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 4px 0;
    padding-bottom: 3px;
    border-bottom: 1px solid #e5e7eb;
  }
  .print-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
  }
  .print-table th {
    background: #f9fafb;
    font-weight: 600;
    color: #374151;
    padding: 3px 6px;
    text-align: left;
    border-bottom: 1px solid #d1d5db;
  }
  .print-table td {
    padding: 3px 6px;
    border-bottom: 1px solid #f3f4f6;
    color: #4b5563;
    vertical-align: middle;
  }
  .print-num-cell {
    width: 30px;
    text-align: center;
  }
  .print-num-badge {
    display: inline-block;
    font-size: 9px;
    font-weight: 700;
    color: #fff;
    border-radius: 3px;
    padding: 1px 5px;
  }
  .print-num-poi { background: #6366f1; }
  .print-num-camera { background: #3b82f6; }
  .print-coord {
    font-family: monospace;
    font-size: 9px;
    color: #9ca3af;
  }
}

/* Page size variants */
[data-print-size="a4-portrait"] { }
[data-print-size="a4-landscape"] { }
[data-print-size="a3-portrait"] { }
[data-print-size="a3-landscape"] { }

@media print {
  html[data-print-size="a4-landscape"] .print-map-wrap,
  html[data-print-size="a4-landscape"] .print-map {
    height: 400px !important;
    min-height: 400px !important;
  }
  html[data-print-size="a3-portrait"] .print-map-wrap,
  html[data-print-size="a3-portrait"] .print-map {
    height: 700px !important;
    min-height: 700px !important;
  }
  html[data-print-size="a3-landscape"] .print-map-wrap,
  html[data-print-size="a3-landscape"] .print-map {
    height: 550px !important;
    min-height: 550px !important;
  }
  html[data-print-size="a3-portrait"] .print-legend-grid,
  html[data-print-size="a3-landscape"] .print-legend-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
