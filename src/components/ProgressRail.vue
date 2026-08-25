<script setup lang="ts">
defineProps<{ fraction: number; tone: string }>()
</script>

<template>
  <div class="rail">
    <div class="fill" :style="{ transform: `scaleX(${fraction})`, background: tone }"></div>
  </div>
</template>

<style scoped>
.rail {
  height: var(--rail);
  background: var(--ground-sunk);
  overflow: hidden;
}

.fill {
  height: 100%;
  transform-origin: left center;
  will-change: transform;
}
</style>
