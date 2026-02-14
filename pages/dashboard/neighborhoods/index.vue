<script setup>
definePageMeta({ middleware: ['auth'] })

const { list, remove, publish } = useNeighborhoods()
const items = ref([])
const loading = ref(true)

const load = async () => {
  loading.value = true
  try {
    const res = await list()
    items.value = res.data || []
  } finally {
    loading.value = false
  }
}

const deleteItem = async (id) => {
  if (!confirm('Ochirishni tasdiqlaysizmi?')) return
  await remove(id)
  await load()
}

const publishItem = async (id) => {
  await publish(id)
  await load()
}

const statusColor = (status) => {
  const map = { published: 'bg-emerald-100 text-emerald-700', draft: 'bg-amber-100 text-amber-700', archived: 'bg-gray-100 text-gray-600' }
  return map[status] || map.draft
}

await load()
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Mahallalar</h1>
        <p class="text-gray-500 mt-1">Barcha yaratilgan mahallalar ro'yxati</p>
      </div>
      <NuxtLink
        to="/dashboard/neighborhoods/create"
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        Yangi mahalla
      </NuxtLink>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <div class="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto" />
      <p class="text-gray-500 mt-4">Yuklanmoqda...</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="!items.length" class="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
      <h3 class="text-lg font-bold text-gray-900 mb-1">Mahallalar topilmadi</h3>
      <p class="text-gray-500 mb-4">Birinchi mahallangizni yarating</p>
      <NuxtLink
        to="/dashboard/neighborhoods/create"
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        Yangi mahalla
      </NuxtLink>
    </div>

    <!-- Table -->
    <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="bg-gray-50 border-b border-gray-200">
            <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Mahalla</th>
            <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Joylashuv</th>
            <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Maydon</th>
            <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
            <th class="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Amallar</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="item in items" :key="item.id" class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4">
              <NuxtLink :to="`/dashboard/neighborhoods/${item.id}`" class="flex items-center gap-3 group">
                <div class="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div>
                  <p class="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{{ item.name }}</p>
                  <p class="text-xs text-gray-400">#{{ item.id }}</p>
                </div>
              </NuxtLink>
            </td>
            <td class="px-6 py-4 text-sm text-gray-600">
              {{ [item.location?.region, item.location?.district].filter(Boolean).join(', ') || '-' }}
            </td>
            <td class="px-6 py-4 text-sm text-gray-600">
              {{ item.area ? `${item.area} km2` : '-' }}
            </td>
            <td class="px-6 py-4">
              <span class="text-xs font-medium px-2.5 py-1 rounded-full" :class="statusColor(item.status)">{{ item.status }}</span>
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center justify-end gap-2">
                <button
                  v-if="item.status === 'draft'"
                  @click="publishItem(item.id)"
                  class="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                  title="Nashr qilish"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                </button>
                <NuxtLink
                  :to="`/dashboard/neighborhoods/${item.id}`"
                  class="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Tahrirlash"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </NuxtLink>
                <button
                  @click="deleteItem(item.id)"
                  class="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                  title="O'chirish"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
