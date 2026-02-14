<script setup>
const auth = useAuth()
const router = useRouter()
const route = useRoute()

const sidebarOpen = ref(true)

const isAdmin = computed(() => {
  const roles = auth.user.value?.roles || []
  return roles.includes('admin') || roles.includes('super-admin')
})

const navItems = computed(() => {
  const items = [
    { to: '/dashboard', label: 'Bosh sahifa', icon: 'home' },
    { to: '/dashboard/neighborhoods', label: 'Mahallalar', icon: 'map' },
    { to: '/dashboard/neighborhoods/create', label: 'Yangi mahalla', icon: 'plus' },
  ]
  if (isAdmin.value) {
    items.push(
      { to: '/dashboard/admin/users', label: 'Foydalanuvchilar', icon: 'users' },
      { to: '/dashboard/admin/neighborhoods', label: 'Tasdiqlash', icon: 'check' },
    )
  }
  return items
})

const isActive = (path) => {
  if (path === '/dashboard') return route.path === '/dashboard'
  return route.path.startsWith(path)
}

const logout = async () => {
  await auth.logout()
  await router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex">
    <!-- Sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-30 flex flex-col bg-slate-900 text-white transition-all duration-300"
      :class="sidebarOpen ? 'w-64' : 'w-20'"
    >
      <!-- Logo -->
      <div class="flex items-center gap-3 px-5 h-16 border-b border-slate-700/50">
        <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
        </div>
        <span v-if="sidebarOpen" class="text-lg font-bold tracking-tight whitespace-nowrap">Mahalla Xarita</span>
      </div>

      <!-- Nav -->
      <nav class="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
          :class="isActive(item.to) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'"
        >
          <!-- Icons -->
          <svg v-if="item.icon === 'home'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" /></svg>
          <svg v-if="item.icon === 'map'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
          <svg v-if="item.icon === 'plus'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
          <svg v-if="item.icon === 'users'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <svg v-if="item.icon === 'check'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span v-if="sidebarOpen" class="whitespace-nowrap">{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <!-- User -->
      <div class="border-t border-slate-700/50 p-3">
        <div class="flex items-center gap-3 px-3 py-2">
          <div class="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 text-sm font-bold text-white">
            {{ (auth.user.value?.name || 'U').charAt(0).toUpperCase() }}
          </div>
          <div v-if="sidebarOpen" class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white truncate">{{ auth.user.value?.name || 'Foydalanuvchi' }}</p>
            <p class="text-xs text-slate-400 truncate">{{ auth.user.value?.email }}</p>
          </div>
        </div>
        <button
          @click="logout"
          class="mt-2 w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-red-600/20 hover:text-red-400 transition-colors"
        >
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          <span v-if="sidebarOpen">Chiqish</span>
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex-1 transition-all duration-300" :class="sidebarOpen ? 'ml-64' : 'ml-20'">
      <!-- Top bar -->
      <header class="h-16 bg-white border-b border-gray-200 flex items-center px-6 sticky top-0 z-20">
        <button @click="sidebarOpen = !sidebarOpen" class="p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div class="ml-4 flex items-center gap-2 text-sm text-gray-500">
          <NuxtLink to="/dashboard" class="hover:text-indigo-600 transition-colors">Dashboard</NuxtLink>
          <template v-if="route.path !== '/dashboard'">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5l7 7-7 7" /></svg>
            <span class="text-gray-800 font-medium">
              {{ route.path.includes('admin') ? 'Admin' : route.path.includes('create') ? 'Yangi mahalla' : route.path.includes('neighborhoods') ? 'Mahallalar' : '' }}
            </span>
          </template>
        </div>
      </header>

      <!-- Page content -->
      <main class="p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

<style>
@media print {
  .min-h-screen.bg-gray-50.flex > aside {
    display: none !important;
  }
  .min-h-screen.bg-gray-50.flex > div > header {
    display: none !important;
  }
  .min-h-screen.bg-gray-50.flex > div {
    margin-left: 0 !important;
  }
  .min-h-screen.bg-gray-50.flex > div > main {
    padding: 0 !important;
  }
}
</style>
