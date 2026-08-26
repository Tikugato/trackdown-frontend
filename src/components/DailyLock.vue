<script setup lang="ts">
defineEmits<{ login: [] }>()

const PERKS = ['Play the daily in every pool', 'Compare against friends', 'Track your own stats and history']
</script>

<template>
  <section class="lock">
    <h2>Log in to play</h2>
    <p class="pitch">One track a day from a clip that grows every time you miss. Guests sit this one out.</p>

    <ul class="perks">
      <li v-for="perk in PERKS" :key="perk">
        <span class="tick" aria-hidden="true"></span>
        {{ perk }}
      </li>
    </ul>

    <button type="button" data-tone="loud" class="go" @click="$emit('login')">Log in with Discord</button>
  </section>
</template>

<style scoped>
.lock {
  border-top: 1px solid var(--rule);
  padding-top: var(--space-32);
  max-width: 46rem;
}

h2 {
  font-family: var(--font-display);
  font-size: var(--text-display);
  font-weight: 200;
  letter-spacing: -0.02em;
}

.pitch {
  margin-top: var(--space-12);
  max-width: 52ch;
  color: var(--ink-soft);
}

.perks {
  margin-top: var(--space-32);
  border-top: 1px solid var(--rule);
}

.perks li {
  display: flex;
  align-items: baseline;
  gap: var(--space-16);
  padding-block: var(--space-16);
  border-bottom: 1px solid var(--rule);
  font-family: var(--font-display);
  font-size: var(--text-heading);
  font-weight: 500;
}

.tick {
  flex: none;
  width: 0.5rem;
  height: 0.5rem;
  background: var(--spot-blue);
  transform: translateY(-0.15em);
}

.go {
  margin-top: var(--space-32);
}

@media (max-width: 40rem) {
  h2 {
    font-size: var(--text-title);
  }

  .go {
    width: 100%;
  }
}
</style>
