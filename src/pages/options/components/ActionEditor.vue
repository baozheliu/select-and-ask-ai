<script setup>
import { computed, reactive, ref } from 'vue'
import { t } from '../../../shared/i18n.js'
import { AI_PROVIDERS, getProviderName } from '../../../shared/providers.js'
import {
  MAX_ASK_COUNT,
  MIN_ASK_COUNT,
  TAB_CONFIRM_THRESHOLD,
  TRIPLE_ASK_COUNT,
  buildTaskPlan,
  describeTaskPlan,
  validateQuickAction,
} from '../../../shared/quick-actions.js'
import IconChevron from './IconChevron.vue'

const props = defineProps({
  action: { type: Object, required: true },
  enabledProviderIds: { type: Array, required: true },
})

const emit = defineEmits(['save', 'cancel'])

const form = reactive({
  ...props.action,
  targetProviderIds: [...props.action.targetProviderIds],
  askCounts: { ...props.action.askCounts },
  // 一个开关同时控制网页标题与地址，减少选择负担
  includePageSource: props.action.includePageTitle || props.action.includePageUrl,
})

const isNew = !props.action.name
const targetMode = ref(form.targetProviderIds.length ? 'custom' : 'all')
const showMoreSettings = ref(false)
const validationError = ref('')

const enabledProviders = computed(() => (
  AI_PROVIDERS.filter(provider => props.enabledProviderIds.includes(provider.id))
))

const formSnapshot = computed(() => {
  const { includePageSource, ...rest } = form

  return {
    ...rest,
    targetProviderIds: targetMode.value === 'all' ? [] : form.targetProviderIds,
    includePageTitle: includePageSource,
    includePageUrl: includePageSource,
  }
})

const plan = computed(() => buildTaskPlan(formSnapshot.value, props.enabledProviderIds))
const planText = computed(() => describeTaskPlan(plan.value))

const resolvedTargetProviders = computed(() => (
  plan.value.entries.map(entry => ({
    ...entry,
    name: getProviderName(entry.providerId),
  }))
))

function isTargetSelected(providerId) {
  return form.targetProviderIds.includes(providerId)
}

function toggleTarget(providerId) {
  form.targetProviderIds = isTargetSelected(providerId)
    ? form.targetProviderIds.filter(id => id !== providerId)
    : [...form.targetProviderIds, providerId]
}

function getAskCount(providerId) {
  return form.askCounts[providerId] || MIN_ASK_COUNT
}

function adjustAskCount(providerId, offset) {
  const next = Math.min(MAX_ASK_COUNT, Math.max(MIN_ASK_COUNT, getAskCount(providerId) + offset))
  form.askCounts = { ...form.askCounts, [providerId]: next }
}

function applyTripleAsk() {
  const next = { ...form.askCounts }
  for (const entry of plan.value.entries) {
    next[entry.providerId] = TRIPLE_ASK_COUNT
  }
  form.askCounts = next
}

function save() {
  const candidate = formSnapshot.value
  const message = validateQuickAction(candidate)

  if (message) {
    validationError.value = message
    return
  }

  if (targetMode.value === 'custom' && !form.targetProviderIds.length) {
    validationError.value = t('editorSelectTargetOrAll')
    return
  }

  validationError.value = ''
  emit('save', candidate)
}
</script>

<template>
  <div class="editor-overlay" @click.self="emit('cancel')">
    <section class="editor glass stack">
      <div class="row">
        <h2 class="title">{{ isNew ? t('editorNewTitle') : t('editorEditTitle') }}</h2>
        <button class="chip-button" type="button" @click="emit('cancel')">✕</button>
      </div>

      <div class="field">
        <label for="action-name">{{ t('editorNameLabel') }}</label>
        <input
          id="action-name"
          v-model="form.name"
          class="input"
          type="text"
          :placeholder="t('editorNamePlaceholder')"
        />
      </div>

      <div class="field">
        <label for="action-instruction">{{ t('editorInstructionLabel') }}</label>
        <textarea
          id="action-instruction"
          v-model="form.instruction"
          class="input"
          rows="4"
          :placeholder="t('editorInstructionPlaceholder')"
        ></textarea>
      </div>

      <div class="field">
        <label>{{ t('editorSendTo') }}</label>
        <div class="segmented">
          <button
            type="button"
            :class="{ active: targetMode === 'all' }"
            @click="targetMode = 'all'"
          >{{ t('optionsAllEnabledAi') }}</button>
          <button
            type="button"
            :class="{ active: targetMode === 'custom' }"
            @click="targetMode = 'custom'"
          >{{ t('editorTargetCustom') }}</button>
        </div>

        <div v-if="targetMode === 'custom'" class="target-chips">
          <button
            v-for="provider in enabledProviders"
            :key="provider.id"
            type="button"
            class="target-chip"
            :class="{ active: isTargetSelected(provider.id) }"
            @click="toggleTarget(provider.id)"
          >
            <span class="target-dot" :style="{ background: provider.brandColor }"></span>
            {{ getProviderName(provider.id) }}
          </button>
          <p v-if="!enabledProviders.length" class="muted chips-empty">
            {{ t('editorNoEnabledProviders') }}
          </p>
        </div>
      </div>

      <button
        class="more-toggle"
        type="button"
        @click="showMoreSettings = !showMoreSettings"
      >
        <span class="more-arrow" :class="{ open: showMoreSettings }">
          <IconChevron direction="right" />
        </span>
        {{ t('editorMoreSettings') }}
        <span class="muted more-hint">{{ t('editorMoreHint') }}</span>
      </button>

      <div v-if="showMoreSettings" class="glass-inset more-settings stack">
        <div class="field">
          <div class="row">
            <label>{{ t('editorAskCounts') }}</label>
            <button class="chip-button" type="button" @click="applyTripleAsk">
              {{ t('editorTripleAsk') }}
            </button>
          </div>
          <p class="muted small-hint">{{ t('editorAskCountHint') }}</p>

          <div v-if="resolvedTargetProviders.length" class="ask-count-list">
            <div v-for="entry in resolvedTargetProviders" :key="entry.providerId" class="ask-count-row">
              <span>{{ entry.name }}</span>
              <span class="stepper">
                <button
                  type="button"
                  :disabled="getAskCount(entry.providerId) <= MIN_ASK_COUNT"
                  @click="adjustAskCount(entry.providerId, -1)"
                >−</button>
                <span class="stepper-value">{{ t('editorAskCountTimes', getAskCount(entry.providerId)) }}</span>
                <button
                  type="button"
                  :disabled="getAskCount(entry.providerId) >= MAX_ASK_COUNT"
                  @click="adjustAskCount(entry.providerId, 1)"
                >＋</button>
              </span>
            </div>
          </div>
          <p v-else class="muted small-hint">{{ t('editorNoTargetProviders') }}</p>
        </div>

        <label class="option-row">
          <span>
            <span class="option-name">{{ t('editorAutoSend') }}</span>
            <span class="option-desc muted">{{ t('editorAutoSendDesc') }}</span>
          </span>
          <input v-model="form.autoSend" type="checkbox" class="switch" />
        </label>

        <label class="option-row">
          <span>
            <span class="option-name">{{ t('editorIncludeSource') }}</span>
            <span class="option-desc muted">{{ t('editorIncludeSourceDesc') }}</span>
          </span>
          <input v-model="form.includePageSource" type="checkbox" class="switch" />
        </label>
      </div>

      <div
        class="callout"
        :class="plan.totalTabs > TAB_CONFIRM_THRESHOLD ? 'warning' : 'success'"
      >
        <span>{{ planText }}</span>
        <span v-if="plan.totalTabs > TAB_CONFIRM_THRESHOLD && !form.skipTabWarning">
          {{ t('editorTabWarning', TAB_CONFIRM_THRESHOLD) }}
        </span>
      </div>

      <p v-if="validationError" class="callout danger">{{ validationError }}</p>

      <div class="editor-actions">
        <button class="button secondary" type="button" @click="emit('cancel')">{{ t('commonCancel') }}</button>
        <button class="button" type="button" @click="save">{{ t('commonSave') }}</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.editor-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 40px 16px;
  overflow-y: auto;
  background: rgba(15, 23, 42, 0.35);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  animation: overlay-in 0.25s ease;
}

.editor {
  width: min(560px, 100%);
  padding: 24px;
  animation: dialog-in 0.35s cubic-bezier(0.2, 1.2, 0.4, 1);
}

@keyframes overlay-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes dialog-in {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .editor-overlay,
  .editor {
    animation: none;
  }
}

.target-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 2px;
}

.target-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1.5px solid var(--lg-glass-border);
  background: var(--lg-glass-muted);
  font-size: 13px;
  font-weight: 550;
  cursor: pointer;
  transition: all 0.15s ease;
}

.target-chip:hover {
  background: var(--lg-glass-strong);
}

.target-chip.active {
  border-color: var(--lg-tint);
  background: var(--lg-tint-soft);
  color: var(--lg-tint);
}

.target-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.chips-empty {
  font-size: 12.5px;
}

.more-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--lg-text);
  cursor: pointer;
  padding: 4px 2px;
}

.more-arrow {
  display: inline-flex;
  color: var(--lg-text-tertiary);
  transition: transform 0.2s ease;
}

.more-arrow.open {
  transform: rotate(90deg);
}

.more-hint {
  font-size: 12px;
  font-weight: 400;
}

.more-settings {
  padding: 16px;
  gap: 12px;
}

.small-hint {
  font-size: 12px;
}

.ask-count-list {
  display: grid;
  gap: 8px;
  margin-top: 4px;
}

.ask-count-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13.5px;
}

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
}

.option-name {
  display: block;
  font-weight: 600;
  font-size: 13.5px;
}

.option-desc {
  display: block;
  font-size: 12px;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
