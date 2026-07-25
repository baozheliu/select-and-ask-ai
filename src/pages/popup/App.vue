<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  ExtensionMessage,
  createExtensionMessage,
  sendRuntimeMessage,
} from '../../extension/messaging.js'
import { t } from '../../shared/i18n.js'
import { AI_PROVIDERS, getProviderName } from '../../shared/providers.js'
import GlassFilter from '../components/GlassFilter.vue'
import ProviderIcon from '../components/ProviderIcon.vue'

const settings = ref(null)
const actions = ref([])
const error = ref('')

const enabledProviders = computed(() => (
  AI_PROVIDERS.filter(provider => (settings.value?.enabledProviderIds || []).includes(provider.id))
))

const enabledActionCount = computed(() => (
  actions.value.filter(action => action.enabled).length
))

async function loadState() {
  error.value = ''

  try {
    const [loadedSettings, loadedActions] = await Promise.all([
      sendRuntimeMessage(createExtensionMessage(ExtensionMessage.getSettings)),
      sendRuntimeMessage(createExtensionMessage(ExtensionMessage.getQuickActions)),
    ])

    settings.value = loadedSettings
    actions.value = loadedActions
  } catch (err) {
    error.value = err.message || String(err)
  }
}

async function openOptions() {
  await sendRuntimeMessage(createExtensionMessage(ExtensionMessage.openOptions))
  window.close()
}

const extensionVersion = (() => {
  try {
    return (globalThis.browser || globalThis.chrome)?.runtime?.getManifest?.().version || ''
  } catch {
    return ''
  }
})()

onMounted(loadState)
</script>

<template>
  <div class="lg-scene popup-scene">
    <GlassFilter />
    <main class="popup-shell stack">
      <div class="row">
        <div class="brand">
          <span class="brand-icon">✦</span>
          <h1 class="title">Select &amp; Ask AI</h1>
        </div>
        <button class="chip-button" type="button" @click="openOptions">{{ t('commonSettings') }}</button>
      </div>

      <div v-if="error" class="callout danger">{{ error }}</div>

      <template v-else-if="settings">
        <div class="glass card stack">
          <template v-if="enabledProviders.length">
            <div class="avatar-row">
              <span
                v-for="provider in enabledProviders"
                :key="provider.id"
                class="mini-avatar"
                :title="getProviderName(provider.id)"
              >
                <ProviderIcon :provider="provider" :size="28" />
              </span>
            </div>
            <p class="muted card-line">
              {{ t('popupEnabledSummary', [enabledProviders.length, enabledActionCount]) }}
            </p>
          </template>

          <template v-else>
            <p class="card-line">{{ t('popupNoProviders') }}</p>
            <button class="button" type="button" @click="openOptions">{{ t('popupGoToSettings') }}</button>
          </template>
        </div>

        <div v-if="enabledProviders.length" class="glass card usage">
          <span class="usage-step">1</span>
          <span>{{ t('popupUsage1Before') }}<strong>{{ t('popupUsage1Strong') }}</strong>{{ t('popupUsage1After') }}</span>
          <span class="usage-step">2</span>
          <span>{{ t('popupUsage2Before') }}<strong>{{ t('popupUsage2Strong') }}</strong>{{ t('popupUsage2After') }}</span>
        </div>
      </template>

      <div v-else class="glass card">{{ t('commonLoading') }}</div>

      <p v-if="extensionVersion" class="version muted">v{{ extensionVersion }}</p>
    </main>
  </div>
</template>

<style scoped>
.popup-scene {
  min-height: auto;
}

.popup-shell {
  width: 320px;
  padding: 16px;
  gap: 12px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-icon {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  font-size: 14px;
  color: #fff;
  border-radius: 9px;
  background: linear-gradient(135deg, #0a84ff 0%, #bf5af2 100%);
  box-shadow: 0 4px 12px rgba(94, 92, 230, 0.35);
}

.title {
  font-size: 15px;
}

.card {
  padding: 16px;
  border-radius: var(--lg-radius-l);
  gap: 10px;
}

.card-line {
  margin: 0;
  font-size: 13px;
}

.avatar-row {
  display: flex;
}

.mini-avatar {
  display: inline-flex;
  border-radius: 10px;
  border: 2px solid var(--lg-glass-strong);
  margin-right: -6px;
  background: var(--lg-glass-strong);
}

.version {
  margin: 0;
  text-align: center;
  font-size: 11px;
  color: var(--lg-text-tertiary);
}

.usage {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 8px 10px;
  font-size: 13px;
  color: var(--lg-text-secondary);
}

.usage strong {
  color: var(--lg-text);
}

.usage-step {
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(180deg, var(--lg-tint), var(--lg-tint-strong));
}
</style>
