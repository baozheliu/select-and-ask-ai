<script setup>
import { computed, ref } from 'vue'
import { getProviderName } from '../../shared/providers.js'

const props = defineProps({
  provider: { type: Object, required: true },
  size: { type: Number, default: 34 },
})

// 依次尝试：官方图标 → 公共 favicon 服务 → 品牌色首字母
const displayName = computed(() => getProviderName(props.provider.id))

const candidates = computed(() => [
  props.provider.iconUrl,
  `https://www.google.com/s2/favicons?domain=${props.provider.hosts[0]}&sz=64`,
].filter(Boolean))

const candidateIndex = ref(0)

const currentUrl = computed(() => candidates.value[candidateIndex.value] || null)

function handleError() {
  candidateIndex.value += 1
}

const sizeStyle = {
  width: `${props.size}px`,
  height: `${props.size}px`,
  borderRadius: `${Math.round(props.size * 0.32)}px`,
}
</script>

<template>
  <span class="provider-icon" :style="sizeStyle">
    <img
      v-if="currentUrl"
      :key="currentUrl"
      :src="currentUrl"
      :alt="displayName"
      loading="lazy"
      @error="handleError"
    />
    <span
      v-else
      class="provider-icon-fallback"
      :style="{ background: provider.brandColor, fontSize: `${Math.round(size * 0.44)}px` }"
    >
      {{ displayName.slice(0, 1).toUpperCase() }}
    </span>
  </span>
</template>

<style scoped>
.provider-icon {
  position: relative;
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.85);
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

@media (prefers-color-scheme: dark) {
  .provider-icon {
    background: rgba(255, 255, 255, 0.92);
  }
}

.provider-icon img {
  width: 72%;
  height: 72%;
  object-fit: contain;
}

.provider-icon-fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 700;
}
</style>
