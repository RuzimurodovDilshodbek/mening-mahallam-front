<script setup>
definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
const { one, update } = useNeighborhoods()

const form = reactive({
  id: null,
  name: '',
  description: '',
  region: '',
  district: '',
  city: '',
  boundary_coordinates: [],
})

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const success = ref('')

const load = async () => {
  loading.value = true
  try {
    const res = await one(route.params.id)
    const n = res.data
    form.id = n.id
    form.name = n.name
    form.description = n.description || ''
    form.region = n.location?.region || ''
    form.district = n.location?.district || ''
    form.city = n.location?.city || ''
    form.boundary_coordinates = n.boundary_coordinates || []
  } catch {
    error.value = 'Ma\'lumotni yuklashda xatolik.'
  } finally {
    loading.value = false
  }
}

const submit = async () => {
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    await update(form.id, {
      name: form.name,
      description: form.description,
      region: form.region,
      district: form.district,
      city: form.city,
    })
    success.value = 'Muvaffaqiyatli saqlandi!'
    setTimeout(() => { success.value = '' }, 3000)
  } catch {
    error.value = 'Saqlashda xatolik yuz berdi.'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await load()
})
</script>

<template>
  <div class="max-w-5xl">
    <div class="mb-6">
      <NuxtLink to="/dashboard/neighborhoods" class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 transition-colors mb-3">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        Mahallalarga qaytish
      </NuxtLink>
      <h1 class="text-2xl font-bold text-gray-900">Mahallani tahrirlash</h1>
      <p class="text-gray-500 mt-1">{{ form.name || 'Yuklanmoqda...' }}</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <div class="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto" />
      <p class="text-gray-500 mt-4">Yuklanmoqda...</p>
    </div>

    <template v-else>
      <div class="space-y-6">
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Asosiy ma'lumotlar</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Mahalla nomi</label>
              <input
                v-model="form.name"
                type="text"
                class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Viloyat</label>
                <input v-model="form.region" type="text" class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" placeholder="Viloyat" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Tuman</label>
                <input v-model="form.district" type="text" class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" placeholder="Tuman" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Shahar</label>
                <input v-model="form.city" type="text" class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" placeholder="Shahar" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Tavsif</label>
              <textarea v-model="form.description" rows="3" class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none" placeholder="Mahalla haqida..." />
            </div>
          </div>
        </div>

        <!-- Success -->
        <div v-if="success" class="bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-4 rounded-xl text-sm flex items-center gap-2">
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
          {{ success }}
        </div>

        <!-- Error -->
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl text-sm">
          {{ error }}
        </div>

        <div class="flex items-center justify-end gap-3">
          <NuxtLink :to="`/dashboard/neighborhoods/${form.id}/map`" class="px-5 py-2.5 rounded-xl border border-indigo-300 text-indigo-700 font-medium text-sm hover:bg-indigo-50 transition-colors">
            Xaritani tahrirlash
          </NuxtLink>
          <NuxtLink to="/dashboard/neighborhoods" class="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors">
            Bekor qilish
          </NuxtLink>
          <button
            @click="submit"
            :disabled="saving"
            class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
