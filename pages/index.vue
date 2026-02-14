<script setup>
definePageMeta({ layout: false })

const auth = useAuth()

if (auth.isAuthenticated.value) {
  await navigateTo('/dashboard')
} else {
  await navigateTo('/login')
}
</script>

<template>
  <div />
</template>
