<template>
  <div>
    <div ref="mapEl" class="w-full rounded-xl border border-gray-200 overflow-hidden" style="height: 500px;" />
    <div class="mt-3 flex items-center gap-4 text-sm text-gray-500">
      <div class="flex items-center gap-1.5">
        <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        Polygon chizish uchun chap paneldagi ko'pburchak ikonkasini bosing
      </div>
    </div>
  </div>
</template>

<script setup>
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:modelValue'])

const mapEl = ref(null)
let map
let L
let drawnItems

const syncCoordinates = () => {
  const layers = drawnItems.getLayers()
  if (!layers.length) {
    emit('update:modelValue', [])
    return
  }

  const latlngs = layers[0].getLatLngs()[0] || []
  const coords = latlngs.map((p) => [Number(p.lat.toFixed(7)), Number(p.lng.toFixed(7))])
  emit('update:modelValue', coords)
}

const drawPolygonFromModel = () => {
  if (!props.modelValue?.length) return

  const polygon = L.polygon(props.modelValue, {
    color: '#6366f1',
    weight: 3,
    fillColor: '#6366f1',
    fillOpacity: 0.1,
  })
  drawnItems.addLayer(polygon)
  map.fitBounds(polygon.getBounds(), { padding: [40, 40] })
}

onMounted(async () => {
  if (!process.client) return

  const leaflet = await import('leaflet')
  await import('leaflet-draw')

  L = leaflet.default || leaflet

  // Fix default marker icons
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })

  map = L.map(mapEl.value).setView([40.171093, 64.927777], 14)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19,
  }).addTo(map)

  drawnItems = new L.FeatureGroup()
  map.addLayer(drawnItems)

  drawPolygonFromModel()

  const drawControl = new L.Control.Draw({
    position: 'topleft',
    edit: {
      featureGroup: drawnItems,
      remove: true,
    },
    draw: {
      polyline: false,
      rectangle: false,
      circle: false,
      marker: false,
      circlemarker: false,
      polygon: {
        allowIntersection: false,
        showArea: true,
        shapeOptions: {
          color: '#6366f1',
          weight: 3,
          fillColor: '#6366f1',
          fillOpacity: 0.1,
        },
      },
    },
  })

  map.addControl(drawControl)

  L.control.scale({ imperial: false, metric: true, position: 'bottomleft' }).addTo(map)

  map.on(L.Draw.Event.CREATED, (event) => {
    drawnItems.clearLayers()
    drawnItems.addLayer(event.layer)
    syncCoordinates()
  })

  map.on(L.Draw.Event.EDITED, syncCoordinates)
  map.on(L.Draw.Event.DELETED, syncCoordinates)

  // Fix map rendering on resize
  setTimeout(() => { map.invalidateSize() }, 200)
})

watch(
  () => props.modelValue,
  (value) => {
    if (!map || !drawnItems) return
    if (!value?.length && drawnItems.getLayers().length) {
      drawnItems.clearLayers()
    }
  }
)
</script>
