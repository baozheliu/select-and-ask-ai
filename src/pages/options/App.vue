<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  ExtensionMessage,
  createExtensionMessage,
  sendRuntimeMessage,
} from '../../extension/messaging.js'
import { t } from '../../shared/i18n.js'
import { AI_PROVIDERS, getProviderName, getProviderVendor } from '../../shared/providers.js'
import {
  buildTaskPlan,
  createQuickAction,
  createQuickActionId,
  describeTaskPlan,
} from '../../shared/quick-actions.js'
import GlassFilter from '../components/GlassFilter.vue'
import ProviderIcon from '../components/ProviderIcon.vue'
import ActionEditor from './components/ActionEditor.vue'
import IconChevron from './components/IconChevron.vue'

const settings = ref({ enabledProviderIds: [], groupTabs: false, onboardingCompleted: false })
const actions = ref([])
const loading = ref(true)
const error = ref('')
const editingAction = ref(null)

const showGuide = computed(() => !settings.value.onboardingCompleted)

const sortedActions = computed(() => (
  [...actions.value].sort((left, right) => left.order - right.order)
))

async function loadAll() {
  loading.value = true
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
  } finally {
    loading.value = false
  }
}

async function saveSettings(patch) {
  try {
    settings.value = await sendRuntimeMessage(
      createExtensionMessage(ExtensionMessage.updateSettings, patch),
    )
  } catch (err) {
    error.value = err.message || String(err)
  }
}

async function persistActions(nextActions) {
  try {
    actions.value = await sendRuntimeMessage(
      createExtensionMessage(ExtensionMessage.saveQuickActions, { actions: nextActions }),
    )
    error.value = ''
  } catch (err) {
    error.value = err.message || String(err)
  }
}

function isProviderEnabled(providerId) {
  return settings.value.enabledProviderIds.includes(providerId)
}

function toggleProvider(providerId) {
  const current = settings.value.enabledProviderIds
  const enabling = !current.includes(providerId)
  const next = enabling
    ? [...current, providerId]
    : current.filter(id => id !== providerId)

  const patch = { enabledProviderIds: next }

  // 启用第一个 AI 即视为完成引导，不需要额外确认步骤
  if (enabling && !settings.value.onboardingCompleted) {
    patch.onboardingCompleted = true
  }

  saveSettings(patch)
}

const extensionVersion = (() => {
  try {
    return (globalThis.browser || globalThis.chrome)?.runtime?.getManifest?.().version || ''
  } catch {
    return ''
  }
})()

const vendorAttribution = computed(() => (
  AI_PROVIDERS
    .map(provider => t('vendorAttributionItem', [
      getProviderName(provider.id),
      getProviderVendor(provider.id),
    ]))
    .join(t('listSeparator'))
))

// 指针跟随高光：光斑随鼠标在玻璃面板上移动
let glareTarget = null

function clearGlare() {
  glareTarget?.style.setProperty('--lg-glare', '0')
  glareTarget = null
}

function handlePointerMove(event) {
  const glass = event.target instanceof Element ? event.target.closest('.glass') : null

  if (glareTarget && glareTarget !== glass) {
    glareTarget.style.setProperty('--lg-glare', '0')
  }

  glareTarget = glass
  if (!glass) return

  const rect = glass.getBoundingClientRect()
  glass.style.setProperty('--lg-px', `${(((event.clientX - rect.left) / rect.width) * 100).toFixed(2)}%`)
  glass.style.setProperty('--lg-py', `${(((event.clientY - rect.top) / rect.height) * 100).toFixed(2)}%`)
  glass.style.setProperty('--lg-glare', '1')
}

function describeAction(action) {
  return describeTaskPlan(buildTaskPlan(action, settings.value.enabledProviderIds))
}

function describeTargets(action) {
  if (!action.targetProviderIds.length) return t('optionsAllEnabledAi')
  return action.targetProviderIds.map(getProviderName).join(t('listSeparator'))
}

function startCreate() {
  editingAction.value = createQuickAction({ name: '', instruction: '' })
}

function startEdit(action) {
  editingAction.value = action
}

function duplicateAction(action) {
  const copy = {
    ...action,
    id: createQuickActionId(),
    name: t('optionsActionCopySuffix', action.name),
    order: sortedActions.value.length,
  }

  persistActions([...actions.value, copy])
}

function deleteAction(action) {
  if (!confirm(t('optionsDeleteConfirm', action.name))) return
  persistActions(actions.value.filter(item => item.id !== action.id))
}

function setActionEnabled(action, enabled) {
  persistActions(actions.value.map(item => (
    item.id === action.id ? { ...item, enabled } : item
  )))
}

function moveAction(action, offset) {
  const list = sortedActions.value
  const index = list.findIndex(item => item.id === action.id)
  const targetIndex = index + offset

  if (targetIndex < 0 || targetIndex >= list.length) return

  const next = [...list]
  const [moved] = next.splice(index, 1)
  next.splice(targetIndex, 0, moved)

  persistActions(next.map((item, order) => ({ ...item, order })))
}

function handleEditorSave(candidate) {
  const exists = actions.value.some(item => item.id === candidate.id)
  const next = exists
    ? actions.value.map(item => (item.id === candidate.id ? candidate : item))
    : [...actions.value, { ...candidate, order: sortedActions.value.length }]

  persistActions(next)
  editingAction.value = null
}

onMounted(() => {
  loadAll()
  document.addEventListener('pointermove', handlePointerMove, { passive: true })
  document.documentElement.addEventListener('pointerleave', clearGlare)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointermove', handlePointerMove)
  document.documentElement.removeEventListener('pointerleave', clearGlare)
})
</script>

<template>
  <div class="lg-scene">
    <GlassFilter />
    <main class="options-shell stack">
      <!-- 顶部 -->
      <header class="hero">
        <div class="hero-icon">✦</div>
        <div>
          <h1 class="hero-title">Select &amp; Ask AI</h1>
          <p class="muted hero-subtitle">{{ t('optionsSubtitle') }}</p>
        </div>
      </header>

      <div v-if="loading" class="glass section">{{ t('commonLoading') }}</div>

      <template v-else>
        <!-- 新手引导：只需一步，开启第一个 AI 后自动消失 -->
        <section v-if="showGuide" class="glass section guide">
          <h2 class="title">{{ t('optionsGuideTitle') }}</h2>
          <div class="guide-steps">
            <div class="guide-step">
              <span class="guide-num">1</span>
              <p>{{ t('optionsGuideStep1Before') }}<strong>{{ t('optionsGuideStep1Strong') }}</strong>{{ t('optionsGuideStep1After') }}</p>
            </div>
            <div class="guide-step">
              <span class="guide-num">2</span>
              <p>{{ t('optionsGuideStep2Before') }}<strong>{{ t('optionsGuideStep2Strong') }}</strong>{{ t('optionsGuideStep2After') }}</p>
            </div>
          </div>
        </section>

        <!-- AI 配置 -->
        <section class="glass section stack">
          <div class="row">
            <h2 class="title">{{ t('optionsMyAi') }}</h2>
            <span class="badge">{{ t('optionsEnabledCount', settings.enabledProviderIds.length) }}</span>
          </div>

          <div class="provider-grid">
            <button
              v-for="provider in AI_PROVIDERS"
              :key="provider.id"
              type="button"
              class="provider-card"
              :class="{ active: isProviderEnabled(provider.id) }"
              @click="toggleProvider(provider.id)"
            >
              <ProviderIcon :provider="provider" :size="34" />
              <span class="provider-text">
                <span class="provider-name">{{ getProviderName(provider.id) }}</span>
                <span class="provider-host">{{ provider.hosts[0] }}</span>
              </span>
              <span class="provider-check" :class="{ on: isProviderEnabled(provider.id) }">
                {{ isProviderEnabled(provider.id) ? '✓' : '' }}
              </span>
            </button>
          </div>

          <label class="setting-row glass-inset">
            <span>
              <span class="setting-name">{{ t('optionsGroupTabs') }}</span>
              <span class="setting-desc muted">{{ t('optionsGroupTabsDesc') }}</span>
            </span>
            <input
              type="checkbox"
              class="switch"
              :checked="settings.groupTabs"
              @change="saveSettings({ groupTabs: $event.target.checked })"
            />
          </label>
        </section>

        <!-- 快捷操作 -->
        <section class="glass section stack">
          <div class="row">
            <h2 class="title">{{ t('optionsQuickActions') }}</h2>
            <button class="button small" type="button" @click="startCreate">{{ t('optionsNewAction') }}</button>
          </div>
          <p class="muted section-hint">{{ t('optionsActionsHint') }}</p>

          <div v-if="!sortedActions.length" class="empty-state muted">
            {{ t('optionsActionsEmpty') }}
          </div>

          <ul class="action-list">
            <li
              v-for="(action, index) in sortedActions"
              :key="action.id"
              class="action-card glass-inset"
              :class="{ off: !action.enabled }"
            >
              <input
                type="checkbox"
                class="switch"
                :checked="action.enabled"
                :title="action.enabled ? t('commonDisable') : t('commonEnable')"
                @change="setActionEnabled(action, $event.target.checked)"
              />

              <button type="button" class="action-body" @click="startEdit(action)">
                <span class="action-title-row">
                  <strong>{{ action.name }}</strong>
                  <span v-if="!action.autoSend" class="badge neutral">{{ t('optionsManualSend') }}</span>
                </span>
                <span class="action-meta muted">
                  {{ describeTargets(action) }} · {{ describeAction(action) }}
                </span>
              </button>

              <span class="action-tools">
                <button class="chip-button icon-only" type="button" :title="t('commonMoveUp')" :disabled="index === 0" @click="moveAction(action, -1)">
                  <IconChevron direction="up" />
                </button>
                <button class="chip-button icon-only" type="button" :title="t('commonMoveDown')" :disabled="index === sortedActions.length - 1" @click="moveAction(action, 1)">
                  <IconChevron direction="down" />
                </button>
                <button class="chip-button" type="button" @click="duplicateAction(action)">{{ t('commonCopy') }}</button>
                <button class="chip-button danger" type="button" @click="deleteAction(action)">{{ t('commonDelete') }}</button>
              </span>
            </li>
          </ul>
        </section>

      <p v-if="error" class="callout danger">{{ error }}</p>

      <footer class="page-footer">
        <p class="footer-version muted">Select &amp; Ask AI{{ extensionVersion ? ` v${extensionVersion}` : '' }}</p>
        <p class="footer-legal">
          {{ t('footerLegal', vendorAttribution) }}
        </p>
      </footer>
    </template>

      <ActionEditor
        v-if="editingAction"
        :key="editingAction.id"
        :action="editingAction"
        :enabled-provider-ids="settings.enabledProviderIds"
        @save="handleEditorSave"
        @cancel="editingAction = null"
      />
    </main>
  </div>
</template>

<style scoped>
.options-shell {
  max-width: 720px;
  margin: 0 auto;
  padding: 32px 20px 64px;
  gap: 18px;
}

.hero {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 6px 4px;
}

.hero-icon {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  font-size: 24px;
  color: #fff;
  border-radius: 16px;
  background: linear-gradient(135deg, #0a84ff 0%, #bf5af2 100%);
  box-shadow: 0 8px 24px rgba(94, 92, 230, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.hero-title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.4px;
}

.hero-subtitle {
  font-size: 13px;
}

.section {
  padding: 22px;
}

/* 各面板扫光错峰，光带依次掠过 */
.section:nth-of-type(2)::after {
  animation-delay: -3.5s;
}

.section:nth-of-type(3)::after {
  animation-delay: -7s;
}

.section-hint {
  margin-top: -6px;
  font-size: 12.5px;
}

/* 引导 */
.guide {
  display: grid;
  gap: 14px;
}

.guide-steps {
  display: grid;
  gap: 12px;
}

.guide-step {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.guide-step p {
  margin: 2px 0 0;
  color: var(--lg-text-secondary);
}

.guide-step strong {
  color: var(--lg-text);
}

.guide-num {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(180deg, var(--lg-tint), var(--lg-tint-strong));
}

/* AI 卡片 */
.provider-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(196px, 1fr));
  gap: 10px;
}

.provider-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--lg-radius-l);
  border: 1.5px solid var(--lg-glass-border);
  background: var(--lg-glass-muted);
  cursor: pointer;
  text-align: left;
  transition: all 0.18s ease;
}

.provider-card:hover {
  background: var(--lg-glass-strong);
  transform: translateY(-1px);
}

.provider-card:active {
  transform: scale(0.98);
}

.provider-card.active {
  border-color: var(--lg-tint);
  background: var(--lg-tint-soft);
  box-shadow: 0 0 0 3px var(--lg-tint-soft);
}

.provider-text {
  display: grid;
  min-width: 0;
}

.provider-name {
  font-weight: 650;
  font-size: 13.5px;
}

.provider-host {
  font-size: 11px;
  color: var(--lg-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.provider-check {
  margin-left: auto;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1.5px solid var(--lg-text-tertiary);
  font-size: 12px;
  font-weight: 800;
  color: transparent;
  transition: all 0.18s ease;
}

.provider-check.on {
  border-color: transparent;
  color: #fff;
  background: linear-gradient(180deg, #40d15f 0%, #2fb84f 100%);
  box-shadow: 0 2px 6px rgba(52, 199, 89, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.4);
  animation: check-pop 0.28s cubic-bezier(0.3, 1.6, 0.5, 1);
}

@keyframes check-pop {
  from { transform: scale(0.5); }
  to { transform: scale(1); }
}

/* 设置行 */
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  cursor: pointer;
}

.setting-name {
  display: block;
  font-weight: 600;
  font-size: 13.5px;
}

.setting-desc {
  display: block;
  font-size: 12px;
}

/* 快捷操作卡片 */
.empty-state {
  padding: 28px;
  text-align: center;
  border: 1.5px dashed var(--lg-glass-border);
  border-radius: var(--lg-radius-l);
}

.action-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 15px;
  border-radius: var(--lg-radius-l);
  transition: opacity 0.2s ease, background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.action-card:hover {
  background: var(--lg-glass-strong);
  transform: translateY(-1px);
  box-shadow: var(--lg-shadow-small);
}

.action-card.off .action-body {
  opacity: 0.45;
}

.action-body {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 3px;
  text-align: left;
  cursor: pointer;
}

.action-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.action-meta {
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-tools {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
}

.page-footer {
  display: grid;
  gap: 6px;
  padding: 10px 8px 0;
  text-align: center;
}

.footer-version {
  font-size: 12px;
  font-weight: 600;
}

.footer-legal {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.7;
  color: var(--lg-text-tertiary);
}

@media (max-width: 560px) {
  .action-card {
    flex-wrap: wrap;
  }

  .action-tools {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
