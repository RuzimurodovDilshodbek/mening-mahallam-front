<script setup>
definePageMeta({ layout: false })

const auth = useAuth()
const router = useRouter()

const email = ref('admin@mahalla.local')
const password = ref('Admin@12345')
const loading = ref(false)
const error = ref('')

if (auth.isAuthenticated.value) {
  await navigateTo('/dashboard')
}

const submit = async () => {
  loading.value = true
  error.value = ''

  try {
    await auth.login(email.value, password.value)
    await router.push('/dashboard')
  } catch {
    error.value = 'Login yoki parol noto\'g\'ri.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex">
    <!-- Left side - decorative -->
    <div class="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 relative overflow-hidden">
      <div class="absolute inset-0 opacity-10">
        <div class="absolute top-20 left-10 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-3xl" />
        <div class="absolute bottom-20 right-10 w-96 h-96 bg-purple-300 rounded-full mix-blend-overlay filter blur-3xl" />
      </div>
      <div class="relative z-10 flex flex-col items-center justify-center w-full px-12 text-white">
        <div class="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-8">
          <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
        </div>
        <h1 class="text-4xl font-bold mb-4 text-center">Mahalla Xarita Tizimi</h1>
        <p class="text-lg text-indigo-200 text-center max-w-md">Mahalla va tuman hududlarini interaktiv xaritada boshqarish tizimi</p>
      </div>
    </div>

    <!-- Right side - form -->
    <div class="flex-1 flex items-center justify-center px-6 bg-gray-50">
      <div class="w-full max-w-md">
        <div class="lg:hidden text-center mb-8">
          <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
            <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900">Mahalla Xarita Tizimi</h1>
        </div>

        <div class="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Tizimga kirish</h2>
          <p class="text-gray-500 mb-8">Ma'lumotlaringizni kiriting</p>

          <form @submit.prevent="submit" class="space-y-5">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                v-model="email"
                type="email"
                required
                class="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Parol</label>
              <input
                v-model="password"
                type="password"
                required
                class="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                placeholder="Parolingizni kiriting"
              />
            </div>

            <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {{ error }}
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {{ loading ? 'Kirish...' : 'Kirish' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
