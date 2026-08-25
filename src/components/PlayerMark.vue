<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ colour: string; avatar?: string | undefined; name: string }>()

const broken = ref(false)

watch(
  () => props.avatar,
  () => (broken.value = false),
)
</script>

<template>
  <span class="mark" :style="{ '--player': colour }">
    <img v-if="avatar && !broken" :src="avatar" :alt="name" loading="lazy" @error="broken = true" />
  </span>
</template>

<style scoped>
.mark {
  display: block;
  flex: none;
  width: var(--mark);
  height: var(--mark);
  background: var(--player);
  overflow: hidden;
}

img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
