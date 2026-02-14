<script setup>
import 'leaflet/dist/leaflet.css'

definePageMeta({ middleware: ['auth'], layout: 'dashboard' })

const route = useRoute()
const config = useRuntimeConfig()
const { one } = useNeighborhoods()
const {
  getPois, updatePoi,
  uploadPoiImage, deletePoiImage, setPrimaryImage,
  getPoiTypes,
} = useNeighborhoodMap()

const neighborhoodId = route.params.id
const poiId = route.params.poiId
const storageBase = `${config.public.apiBase}/storage/`

const neighborhood = ref(null)
const poi = ref(null)
const poiTypes = ref([])
const loading = ref(true)
const showEditModal = ref(false)

// Edit form
const editForm = reactive({
  name: '',
  poi_type_id: null,
  description: '',
  address: '',
  phone: '',
})
const poiTypeSearch = ref('')
const showPoiTypeDropdown = ref(false)

const filteredPoiTypes = computed(() => {
  if (!poiTypeSearch.value) return poiTypes.value
  const q = poiTypeSearch.value.toLowerCase()
  return poiTypes.value.filter(t => t.name.toLowerCase().includes(q))
})

const selectPoiType = (type) => {
  editForm.poi_type_id = type.id
  poiTypeSearch.value = type.name
  showPoiTypeDropdown.value = false
}

// Load
const loadData = async () => {
  loading.value = true
  try {
    const [nRes, poisRes, typesRes] = await Promise.all([
      one(neighborhoodId),
      getPois(neighborhoodId),
      getPoiTypes(),
    ])
    neighborhood.value = nRes.data
    poi.value = poisRes.find(p => p.id == poiId) || null
    poiTypes.value = typesRes
  } catch (e) {
    console.error('Load error', e)
  } finally {
    loading.value = false
  }
}

// Edit
const openEdit = () => {
  if (!poi.value) return
  editForm.name = poi.value.name
  editForm.poi_type_id = poi.value.poi_type_id
  editForm.description = poi.value.description || ''
  editForm.address = poi.value.address || ''
  editForm.phone = poi.value.phone || ''
  poiTypeSearch.value = poi.value.poi_type?.name || ''
  showEditModal.value = true
}

const saveEdit = async () => {
  try {
    const updated = await updatePoi(neighborhoodId, poiId, { ...editForm })
    poi.value = updated
    showEditModal.value = false
  } catch {
    //
  }
}

// Images
const imageInput = ref(null)
const uploadingImage = ref(false)

const handleImageUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  uploadingImage.value = true
  try {
    const image = await uploadPoiImage(neighborhoodId, poiId, file)
    if (!poi.value.images) poi.value.images = []
    poi.value.images.push(image)
  } catch {
    //
  } finally {
    uploadingImage.value = false
    event.target.value = ''
  }
}

const removeImage = async (image) => {
  try {
    await deletePoiImage(neighborhoodId, poiId, image.id)
    poi.value.images = poi.value.images.filter(i => i.id !== image.id)
  } catch {
    //
  }
}

const makePrimary = async (image) => {
  try {
    await setPrimaryImage(neighborhoodId, poiId, image.id)
    poi.value.images.forEach(i => i.is_primary = i.id === image.id)
  } catch {
    //
  }
}

// Mini map
const miniMapEl = ref(null)

const initMiniMap = async () => {
  if (!process.client || !poi.value) return
  const leaflet = await import('leaflet')
  const L = leaflet.default || leaflet

  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })

  const m = L.map(miniMapEl.value, { zoomControl: false, dragging: false, scrollWheelZoom: false })
    .setView([poi.value.latitude, poi.value.longitude], 16)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19,
  }).addTo(m)

  L.marker([poi.value.latitude, poi.value.longitude]).addTo(m)

  setTimeout(() => m.invalidateSize(), 200)
}

await loadData()

onMounted(() => {
  if (poi.value) initMiniMap()
})
</script>

<template>
  <div class="max-w-4xl">
    <!-- Back -->
    <div class="mb-6">
      <NuxtLink :to="`/dashboard/neighborhoods/${neighborhoodId}/map`" class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 transition-colors mb-3">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        Xaritaga qaytish
      </NuxtLink>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <div class="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto" />
    </div>

    <!-- Not found -->
    <div v-else-if="!poi" class="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <p class="text-gray-500">Obyekt topilmadi</p>
    </div>

    <template v-else>
      <div class="space-y-6">
        <!-- Header -->
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <div class="flex items-start justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">{{ poi.name }}</h1>
              <div v-if="poi.poi_type?.name" class="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium">
                {{ poi.poi_type.name }}
              </div>
            </div>
            <button @click="openEdit" class="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
              Tahrirlash
            </button>
          </div>

          <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div v-if="poi.description">
              <span class="text-gray-500">Tavsif:</span>
              <p class="text-gray-900 mt-0.5">{{ poi.description }}</p>
            </div>
            <div v-if="poi.address">
              <span class="text-gray-500">Manzil:</span>
              <p class="text-gray-900 mt-0.5">{{ poi.address }}</p>
            </div>
            <div v-if="poi.phone">
              <span class="text-gray-500">Telefon:</span>
              <p class="text-gray-900 mt-0.5">{{ poi.phone }}</p>
            </div>
          </div>
        </div>

        <!-- Images -->
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">Rasmlar</h2>
            <button @click="imageInput?.click()" :disabled="uploadingImage" class="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/30 hover:shadow-xl transition-all disabled:opacity-60">
              {{ uploadingImage ? 'Yuklanmoqda...' : '+ Rasm yuklash' }}
            </button>
          </div>

          <div v-if="poi.images?.length" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <div v-for="img in poi.images" :key="img.id" class="relative group rounded-xl overflow-hidden border-2 transition-all" :class="img.is_primary ? 'border-indigo-500' : 'border-transparent hover:border-gray-300'">
              <img :src="storageBase + img.path" class="w-full h-32 object-cover" />
              <div v-if="img.is_primary" class="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-medium">Asosiy</div>
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button v-if="!img.is_primary" @click="makePrimary(img)" class="p-2 rounded-full bg-white/90 text-indigo-600 hover:bg-white transition-colors" title="Asosiy qilish">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                </button>
                <button @click="removeImage(img)" class="p-2 rounded-full bg-white/90 text-red-600 hover:bg-white transition-colors" title="O'chirish">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          </div>
          <div v-else class="text-center text-sm text-gray-400 py-8">Hali rasm yuklanmagan</div>

          <input ref="imageInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="handleImageUpload" />
        </div>

        <!-- Mini map -->
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Joylashuv</h2>
          <div ref="miniMapEl" class="w-full rounded-xl overflow-hidden" style="height: 300px;" />
        </div>
      </div>
    </template>

    <!-- Edit Modal -->
    <Teleport to="body">
      <div v-if="showEditModal" class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40" @click.self="showEditModal = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-4">
          <h3 class="text-lg font-bold text-gray-900">Obyektni tahrirlash</h3>

          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nomi</label>
              <input v-model="editForm.name" type="text" class="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" />
            </div>

            <div class="relative">
              <label class="block text-sm font-medium text-gray-700 mb-1">Turi</label>
              <input
                v-model="poiTypeSearch"
                type="text"
                class="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                placeholder="Turni qidiring..."
                @focus="showPoiTypeDropdown = true"
                @input="editForm.poi_type_id = null"
              />
              <div v-if="showPoiTypeDropdown" class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                <button
                  v-for="type in filteredPoiTypes"
                  :key="type.id"
                  @click="selectPoiType(type)"
                  class="w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                >
                  {{ type.name }}
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tavsif</label>
              <textarea v-model="editForm.description" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Manzil</label>
                <input v-model="editForm.address" type="text" class="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input v-model="editForm.phone" type="text" class="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" />
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-2">
            <button @click="showEditModal = false" class="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
              Bekor qilish
            </button>
            <button @click="saveEdit" class="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/30 hover:shadow-xl transition-all">
              Saqlash
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
