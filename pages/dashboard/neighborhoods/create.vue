<script setup>
definePageMeta({ middleware: ['auth'] })

const router = useRouter()
const { create } = useNeighborhoods()

const form = reactive({
  name: '',
  description: '',
  region: '',
  district: '',
  city: '',
})

const saving = ref(false)
const error = ref('')

const submit = async () => {
  if (!form.name) {
    error.value = 'Mahalla nomini kiriting.'
    return
  }

  saving.value = true
  error.value = ''

  try {
    const res = await create(form)
    await router.push(`/dashboard/neighborhoods/${res.data.id}/map`)
  } catch {
    error.value = 'Saqlashda xatolik yuz berdi.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-5xl">
    <div class="mb-6">
      <NuxtLink to="/dashboard/neighborhoods" class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 transition-colors mb-3">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        Mahallalarga qaytish
      </NuxtLink>
      <h1 class="text-2xl font-bold text-gray-900">Yangi mahalla yaratish</h1>
      <p class="text-gray-500 mt-1">Ma'lumotlarni to'ldiring va xaritada chegarani belgilang</p>
    </div>

    <!-- Form -->
    <div class="space-y-6">
      <!-- Basic info card -->
      <div class="bg-white rounded-xl border border-gray-200 p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Asosiy ma'lumotlar</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Mahalla nomi <span class="text-red-500">*</span></label>
            <input
              v-model="form.name"
              type="text"
              class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              placeholder="Masalan: Xo'jaqo'rg'on mahallasi"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Viloyat</label>
              <input
                v-model="form.region"
                type="text"
                class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                placeholder="Viloyat"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Tuman</label>
              <input
                v-model="form.district"
                type="text"
                class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                placeholder="Tuman"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Shahar</label>
              <input
                v-model="form.city"
                type="text"
                class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                placeholder="Shahar"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Tavsif</label>
            <textarea
              v-model="form.description"
              rows="3"
              class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none"
              placeholder="Mahalla haqida qisqacha ma'lumot..."
            />
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl text-sm">
        {{ error }}
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3">
        <NuxtLink
          to="/dashboard/neighborhoods"
          class="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
        >
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
  </div>
</template>
