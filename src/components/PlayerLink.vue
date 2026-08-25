<script setup lang="ts">
defineProps<{ id: string; linkable: boolean; newTab?: boolean }>()
</script>

<template>
  <a v-if="linkable" :href="`/players/${id}`" :target="newTab ? '_blank' : undefined" :rel="newTab ? 'noopener' : undefined">
    <slot />
  </a>
  <span v-else><slot /></span>
</template>

<style scoped>
a {
  color: inherit;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
  text-decoration-color: var(--rule);
}
</style>
