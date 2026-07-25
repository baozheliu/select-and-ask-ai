<script setup>
defineProps({
  direction: { type: String, default: 'up' },
})
</script>

<template>
  <svg
    class="icon-chevron"
    :class="direction"
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M3.5 10L8 5.5L12.5 10"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>

<style scoped>
.icon-chevron {
  display: block;
}

.icon-chevron.down {
  transform: rotate(180deg);
}

.icon-chevron.right {
  transform: rotate(90deg);
}
</style>
