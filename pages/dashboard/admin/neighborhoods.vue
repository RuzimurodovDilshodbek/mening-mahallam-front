<script setup>
definePageMeta({ middleware: ['auth'] })

const auth = useAuth()

const { neighborhoods, verifyNeighborhood } = useAdminApi()
const list = ref([])
const loading = ref(true)

const load = async () => {
  loading.value = true
  try {
    const res = await neighborhoods()
    list.value = res.data || []
  } finally {
    loading.value = false
  }
}

const verifyItem = async (id) => {
  await verifyNeighborhood(id)
  await load()
}

onMounted(async () => {
  await auth.fetchUser()
  if (!(auth.user.value?.roles || []).includes('admin') && !(auth.user.value?.roles || []).includes('super-admin')) {
    await navigateTo('/dashboard')
    return
  }
  await load()
})
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Mahallalarni tasdiqlash</h1>
      <p class="text-gray-500 mt-1">Foydalanuvchilar yaratgan mahallalarni ko'rib chiqing va tasdiqlang</p>
    </div>

    <div v-if="loading" class="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <div class="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto" />
    </div>

    <div v-else-if="!list.length" class="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      <h3 class="text-lg font-bold text-gray-900 mb-1">Hech narsa topilmadi</h3>
      <p class="text-gray-500">Tasdiqlash uchun mahallalar yo'q</p>
    </div>

    <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="bg-gray-50 border-b border-gray-200">
            <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Mahalla</th>
            <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Yaratuvchi</th>
            <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
            <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Tasdiqlangan</th>
            <th class="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Amal</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="n in list" :key="n.id" class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div>
                  <p class="font-medium text-gray-900">{{ n.name }}</p>
                  <p class="text-xs text-gray-400">#{{ n.id }}</p>
                </div>
              </div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-600">{{ n.user?.name || '-' }}</td>
            <td class="px-6 py-4">
              <span class="text-xs font-medium px-2.5 py-1 rounded-full" :class="n.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">
                {{ n.status }}
              </span>
            </td>
            <td class="px-6 py-4">
              <span v-if="n.is_verified" class="inline-flex items-center gap-1 text-emerald-600 text-sm font-medium">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                Ha
              </span>
              <span v-else class="text-sm text-gray-400">Yo'q</span>
            </td>
            <td class="px-6 py-4 text-right">
              <button
                v-if="!n.is_verified"
                @click="verifyItem(n.id)"
                class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                Tasdiqlash
              </button>
              <span v-else class="text-sm text-gray-400">Tasdiqlangan</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
