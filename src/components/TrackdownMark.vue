<script setup lang="ts"></script>

<template>
  <span class="mark" role="img" aria-label="Trackdown">
    <span class="row">
      <span aria-hidden="true">TR</span>
      <svg class="glyph note" viewBox="-6 0 86 72" aria-hidden="true">
        <path d="M11 53 L30 6 L74 6 L60 53" />
        <path d="M19.5 32 L66.3 32" />
        <ellipse class="head" cx="8" cy="58" rx="10" ry="8" transform="rotate(-20 8 58)" />
        <ellipse class="head" cx="57" cy="58" rx="8.5" ry="7" transform="rotate(-20 57 58)" />
      </svg>
      <span aria-hidden="true">CK</span>
    </span>
    <span class="row">
      <span aria-hidden="true">D</span>
      <svg class="glyph ring" viewBox="0 0 72 72" aria-hidden="true">
        <circle cx="36" cy="36" r="32" />
        <path d="M36 14 L36 44" />
        <path class="head" d="M22 40 L50 40 L36 62 Z" />
      </svg>
      <span aria-hidden="true">WN</span>
    </span>
  </span>
</template>

<style scoped>
.mark {
  display: inline-flex;
  flex-direction: column;
  font-family: var(--font-display);
  font-weight: 500;
  line-height: 0.86;
  letter-spacing: 0.04em;
  color: var(--ink);
}

.row {
  display: flex;
  align-items: center;
}

.row:last-of-type {
  color: var(--spot-red);
}

.glyph {
  height: 0.72em;
  fill: none;
  stroke: currentColor;
  stroke-width: 6;
  stroke-linecap: butt;
  stroke-linejoin: miter;
  vector-effect: non-scaling-stroke;
}

.glyph.note {
  width: 0.92em;
}

.glyph.ring {
  width: 0.72em;
}

.head {
  fill: currentColor;
  stroke: none;
}
</style>
