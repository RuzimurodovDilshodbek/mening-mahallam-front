<script setup>
definePageMeta({ middleware: ['auth'] })

const auth = useAuth()
const { list } = useNeighborhoods()
const { users } = useAdminApi()

const neighborhoodsCount = ref(0)
const usersCount = ref(0)
const recentNeighborhoods = ref([])

await auth.fetchUser()

const isAdmin = computed(() => {
  const roles = auth.user.value?.roles || []
  return roles.includes('admin') || roles.includes('super-admin')
})

try {
  const res = await list()
  neighborhoodsCount.value = res?.meta?.total || res?.data?.length || 0
  recentNeighborhoods.value = (res?.data || []).slice(0, 5)
} catch {}

if (isAdmin.value) {
  try {
    const res = await users()
    usersCount.value = res?.meta?.total || res?.data?.length || 0
  } catch {}
}

const statusColor = (status) => {
  const map = { published: 'bg-emerald-100 text-emerald-700', draft: 'bg-amber-100 text-amber-700', archived: 'bg-gray-100 text-gray-600' }
  return map[status] || map.draft
}
</script>

<template>
  <div>
    <!-- Welcome -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900">Xush kelibsiz, {{ auth.user.value?.name || 'Foydalanuvchi' }}!</h1>
      <p class="text-gray-500 mt-1">Mahalla xarita tizimining boshqaruv paneli</p>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      <div class="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Mahallalar</p>
            <p class="text-3xl font-bold text-gray-900 mt-1">{{ neighborhoodsCount }}</p>
          </div>
          <div class="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
            <svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
          </div>
        </div>
      </div>

      <div v-if="isAdmin" class="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Foydalanuvchilar</p>
            <p class="text-3xl font-bold text-gray-900 mt-1">{{ usersCount }}</p>
          </div>
          <div class="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Rol</p>
            <p class="text-lg font-bold text-gray-900 mt-1 capitalize">{{ (auth.user.value?.roles || ['user']).join(', ') }}</p>
          </div>
          <div class="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
            <svg class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick actions -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
      <NuxtLink to="/dashboard/neighborhoods/create" class="group bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white hover:shadow-xl hover:shadow-indigo-500/25 transition-all hover:-translate-y-1">
        <svg class="w-8 h-8 mb-3 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        <h3 class="text-lg font-bold">Yangi mahalla yaratish</h3>
        <p class="text-indigo-200 text-sm mt-1">Xaritada chegara belgilang</p>
      </NuxtLink>

      <NuxtLink to="/dashboard/neighborhoods" class="group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md hover:border-indigo-200 transition-all hover:-translate-y-1">
        <svg class="w-8 h-8 mb-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
        <h3 class="text-lg font-bold text-gray-900">Mahallalar ro'yxati</h3>
        <p class="text-gray-500 text-sm mt-1">Barcha mahallalarni ko'rish</p>
      </NuxtLink>

      <NuxtLink v-if="isAdmin" to="/dashboard/admin/neighborhoods" class="group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md hover:border-emerald-200 transition-all hover:-translate-y-1">
        <svg class="w-8 h-8 mb-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <h3 class="text-lg font-bold text-gray-900">Tasdiqlash</h3>
        <p class="text-gray-500 text-sm mt-1">Mahallalarni tasdiqlash</p>
      </NuxtLink>
    </div>

    <!-- Recent neighborhoods -->
    <div class="bg-white rounded-xl border border-gray-200">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 class="text-lg font-bold text-gray-900">So'nggi mahallalar</h2>
        <NuxtLink to="/dashboard/neighborhoods" class="text-sm text-indigo-600 hover:text-indigo-700 font-medium">Barchasini ko'rish</NuxtLink>
      </div>
      <div v-if="recentNeighborhoods.length" class="divide-y divide-gray-100">
        <NuxtLink
          v-for="n in recentNeighborhoods"
          :key="n.id"
          :to="`/dashboard/neighborhoods/${n.id}`"
          class="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <div>
              <p class="font-medium text-gray-900">{{ n.name }}</p>
              <p class="text-sm text-gray-500">{{ n.location?.region || '' }} {{ n.location?.district || '' }}</p>
            </div>
          </div>
          <span class="text-xs font-medium px-2.5 py-1 rounded-full" :class="statusColor(n.status)">{{ n.status }}</span>
        </NuxtLink>
      </div>
      <div v-else class="px-6 py-12 text-center">
        <svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
        <p class="text-gray-500">Hali mahalla yaratilmagan</p>
        <NuxtLink to="/dashboard/neighborhoods/create" class="inline-block mt-3 text-sm text-indigo-600 font-medium hover:text-indigo-700">Birinchi mahallani yarating</NuxtLink>
      </div>
    </div>
  </div>
</template>
