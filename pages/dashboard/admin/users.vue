<script setup>
definePageMeta({ middleware: ['auth'] })

const auth = useAuth()

const { users, createUser, updateUser, deleteUser } = useAdminApi()
const list = ref([])
const loading = ref(true)
const saving = ref(false)
const showModal = ref(false)
const editingUser = ref(null)
const errors = ref({})
const successMsg = ref('')

const form = ref({
  name: '',
  email: '',
  password: '',
  phone: '',
  role: 'user',
})

const roles = [
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
  { value: 'super-admin', label: 'Super Admin' },
]

async function loadUsers() {
  loading.value = true
  try {
    const res = await users()
    list.value = res.data || []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingUser.value = null
  form.value = { name: '', email: '', password: '', phone: '', role: 'user' }
  errors.value = {}
  showModal.value = true
}

function openEdit(user) {
  editingUser.value = user
  form.value = {
    name: user.name,
    email: user.email,
    password: '',
    phone: user.phone || '',
    role: user.roles?.[0] || 'user',
  }
  errors.value = {}
  showModal.value = true
}

async function submitForm() {
  saving.value = true
  errors.value = {}
  try {
    const payload = { ...form.value }
    if (editingUser.value && !payload.password) {
      delete payload.password
    }
    if (editingUser.value) {
      await updateUser(editingUser.value.id, payload)
      successMsg.value = 'Foydalanuvchi yangilandi'
    } else {
      await createUser(payload)
      successMsg.value = 'Foydalanuvchi yaratildi'
    }
    showModal.value = false
    await loadUsers()
  } catch (e) {
    if (e.data?.errors) {
      errors.value = e.data.errors
    } else {
      errors.value = { general: [e.data?.message || 'Xatolik yuz berdi'] }
    }
  } finally {
    saving.value = false
    setTimeout(() => { successMsg.value = '' }, 3000)
  }
}

async function confirmDelete(user) {
  if (!confirm(`"${user.name}" foydalanuvchini o'chirishni tasdiqlaysizmi?`)) return
  try {
    await deleteUser(user.id)
    successMsg.value = 'Foydalanuvchi o\'chirildi'
    await loadUsers()
  } catch (e) {
    alert(e.data?.message || 'O\'chirishda xatolik')
  } finally {
    setTimeout(() => { successMsg.value = '' }, 3000)
  }
}

const roleColor = (role) => {
  const map = { 'super-admin': 'bg-purple-100 text-purple-700', admin: 'bg-indigo-100 text-indigo-700', user: 'bg-gray-100 text-gray-600' }
  return map[role] || map.user
}

onMounted(async () => {
  await auth.fetchUser()
  if (!(auth.user.value?.roles || []).includes('admin') && !(auth.user.value?.roles || []).includes('super-admin')) {
    await navigateTo('/dashboard')
    return
  }
  await loadUsers()
})
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Foydalanuvchilar</h1>
        <p class="text-gray-500 mt-1">Tizimdagi barcha foydalanuvchilar</p>
      </div>
      <button
        class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
        @click="openCreate"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Yangi foydalanuvchi
      </button>
    </div>

    <!-- Success message -->
    <div v-if="successMsg" class="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
      {{ successMsg }}
    </div>

    <!-- Loading -->
    <div v-if="loading" class="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <div class="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto" />
    </div>

    <!-- Table -->
    <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="bg-gray-50 border-b border-gray-200">
            <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">ID</th>
            <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Foydalanuvchi</th>
            <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Email</th>
            <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Rol</th>
            <th class="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Amallar</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="u in list" :key="u.id" class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4 text-sm text-gray-500">#{{ u.id }}</td>
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                  {{ (u.name || 'U').charAt(0).toUpperCase() }}
                </div>
                <span class="font-medium text-gray-900">{{ u.name }}</span>
              </div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-600">{{ u.email }}</td>
            <td class="px-6 py-4">
              <div class="flex gap-1.5 flex-wrap">
                <span
                  v-for="role in (u.roles || ['user'])"
                  :key="role"
                  class="text-xs font-medium px-2.5 py-1 rounded-full"
                  :class="roleColor(role)"
                >{{ role }}</span>
              </div>
            </td>
            <td class="px-6 py-4 text-right">
              <div class="flex items-center justify-end gap-2">
                <button
                  class="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                  @click="openEdit(u)"
                >Tahrirlash</button>
                <button
                  class="text-red-600 hover:text-red-800 text-sm font-medium"
                  @click="confirmDelete(u)"
                >O'chirish</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="fixed inset-0 bg-black/50" @click="showModal = false" />
        <div class="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
          <h2 class="text-lg font-bold text-gray-900 mb-4">
            {{ editingUser ? 'Foydalanuvchini tahrirlash' : 'Yangi foydalanuvchi' }}
          </h2>

          <!-- General error -->
          <div v-if="errors.general" class="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
            {{ errors.general[0] }}
          </div>

          <form @submit.prevent="submitForm" class="space-y-4">
            <!-- Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Ism</label>
              <input
                v-model="form.name"
                type="text"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                :class="{ 'border-red-300': errors.name }"
              />
              <p v-if="errors.name" class="text-red-500 text-xs mt-1">{{ errors.name[0] }}</p>
            </div>

            <!-- Email -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                v-model="form.email"
                type="email"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                :class="{ 'border-red-300': errors.email }"
              />
              <p v-if="errors.email" class="text-red-500 text-xs mt-1">{{ errors.email[0] }}</p>
            </div>

            <!-- Password -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Parol
                <span v-if="editingUser" class="text-gray-400 font-normal">(bo'sh qoldiring o'zgartirmaslik uchun)</span>
              </label>
              <input
                v-model="form.password"
                type="password"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                :class="{ 'border-red-300': errors.password }"
              />
              <p v-if="errors.password" class="text-red-500 text-xs mt-1">{{ errors.password[0] }}</p>
            </div>

            <!-- Phone -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input
                v-model="form.phone"
                type="text"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                :class="{ 'border-red-300': errors.phone }"
              />
              <p v-if="errors.phone" class="text-red-500 text-xs mt-1">{{ errors.phone[0] }}</p>
            </div>

            <!-- Role -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select
                v-model="form.role"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                :class="{ 'border-red-300': errors.role }"
              >
                <option v-for="r in roles" :key="r.value" :value="r.value">{{ r.label }}</option>
              </select>
              <p v-if="errors.role" class="text-red-500 text-xs mt-1">{{ errors.role[0] }}</p>
            </div>

            <!-- Buttons -->
            <div class="flex justify-end gap-3 pt-2">
              <button
                type="button"
                class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                @click="showModal = false"
              >Bekor qilish</button>
              <button
                type="submit"
                class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                :disabled="saving"
              >
                {{ saving ? 'Saqlanmoqda...' : (editingUser ? 'Yangilash' : 'Yaratish') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
