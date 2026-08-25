<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import { useLobbyEntry } from '@/game/useLobbyEntry'
import { standings, status } from '@/store/game'

const LobbyStage = defineAsyncComponent(() => import('@/components/LobbyStage.vue'))
const RoundStage = defineAsyncComponent(() => import('@/components/RoundStage.vue'))
const ResultsStage = defineAsyncComponent(() => import('@/components/ResultsStage.vue'))

const target = String(useRoute().params.code ?? '').toUpperCase()
const { joining, failure } = useLobbyEntry(target)
</script>

<template>
  <RoundStage v-if="status === 'playing'" />
  <ResultsStage v-else-if="standings.length" />
  <LobbyStage v-else :code="target" :joining="joining" :failure="failure" />
</template>
