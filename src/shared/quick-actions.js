import { t } from './i18n.js'
import { AI_PROVIDER_IDS, isKnownProviderId } from './providers.js'

export const QUICK_ACTIONS_STORAGE_KEY = 'quickActions'

export const MIN_ASK_COUNT = 1
export const MAX_ASK_COUNT = 5
export const TRIPLE_ASK_COUNT = 3
export const TAB_CONFIRM_THRESHOLD = 10

/**
 * 快捷操作数据模型：
 *
 * - id                字符串，唯一标识，同时用于右键菜单项 id
 * - name              操作名称
 * - instruction       处理要求
 * - enabled           启用状态，停用后不出现在右键菜单
 * - targetProviderIds 目标 AI；空数组表示“全部已启用 AI”
 * - askCounts         每个 AI 的提问次数（1~5），未指定的 AI 取 1
 * - autoSend          是否自动发送
 * - includePageTitle  发送内容是否附加网页标题
 * - includePageUrl    发送内容是否附加网页地址
 * - skipTabWarning    是否跳过“超过 10 个标签页”的执行前确认
 * - order             排序位置，右键菜单按此排序
 */

export function createQuickActionId() {
  if (globalThis.crypto?.randomUUID) {
    return `qa-${globalThis.crypto.randomUUID()}`
  }

  return `qa-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function clampAskCount(value, fallback = MIN_ASK_COUNT) {
  const count = Number(value)

  if (!Number.isInteger(count)) return fallback
  return Math.min(MAX_ASK_COUNT, Math.max(MIN_ASK_COUNT, count))
}

export function createQuickAction(partial = {}) {
  return normalizeQuickAction({
    id: createQuickActionId(),
    ...partial,
  })
}

export function normalizeQuickAction(action = {}, index = 0) {
  const targetProviderIds = Array.isArray(action.targetProviderIds)
    ? action.targetProviderIds.filter(isKnownProviderId)
    : []

  const askCounts = {}
  if (action.askCounts && typeof action.askCounts === 'object') {
    for (const providerId of AI_PROVIDER_IDS) {
      if (providerId in action.askCounts) {
        askCounts[providerId] = clampAskCount(action.askCounts[providerId])
      }
    }
  }

  return {
    id: typeof action.id === 'string' && action.id ? action.id : createQuickActionId(),
    name: typeof action.name === 'string' ? action.name : '',
    instruction: typeof action.instruction === 'string' ? action.instruction : '',
    enabled: action.enabled !== false,
    targetProviderIds,
    askCounts,
    autoSend: action.autoSend !== false,
    includePageTitle: action.includePageTitle === true,
    includePageUrl: action.includePageUrl === true,
    skipTabWarning: action.skipTabWarning === true,
    order: Number.isFinite(action.order) ? action.order : index,
  }
}

export function normalizeQuickActions(actions) {
  if (!Array.isArray(actions)) return []

  return actions
    .map((action, index) => normalizeQuickAction(action, index))
    .sort((left, right) => left.order - right.order)
    .map((action, index) => ({ ...action, order: index }))
}

export function validateQuickAction(action) {
  if (!action || typeof action !== 'object') {
    return t('actionInvalid')
  }

  if (!action.name?.trim()) {
    return t('actionNameRequired')
  }

  if (!action.instruction?.trim()) {
    return t('actionInstructionRequired')
  }

  return null
}

export function createDefaultQuickActions() {
  return normalizeQuickActions([
    {
      id: 'qa-default-summarize',
      name: t('defaultActionSummarizeName'),
      instruction: t('defaultActionSummarizeInstruction'),
      order: 0,
    },
    {
      id: 'qa-default-translate',
      name: t('defaultActionTranslateName'),
      instruction: t('defaultActionTranslateInstruction'),
      order: 1,
    },
  ])
}

/**
 * 解析快捷操作实际生效的目标 AI 列表。
 * 未单独指定目标时使用全部已启用 AI；单独指定时仍以“已启用”为前提。
 */
export function resolveTargetProviderIds(action, enabledProviderIds) {
  const enabled = Array.isArray(enabledProviderIds)
    ? enabledProviderIds.filter(isKnownProviderId)
    : []

  if (!action?.targetProviderIds?.length) {
    return enabled
  }

  return action.targetProviderIds.filter(providerId => enabled.includes(providerId))
}

export function getAskCountForProvider(action, providerId) {
  return clampAskCount(action?.askCounts?.[providerId], MIN_ASK_COUNT)
}

/**
 * 计算一次执行的任务计划：目标 AI、各自提问次数与标签页总数。
 */
export function buildTaskPlan(action, enabledProviderIds) {
  const providerIds = resolveTargetProviderIds(action, enabledProviderIds)

  const entries = providerIds.map(providerId => ({
    providerId,
    askCount: getAskCountForProvider(action, providerId),
  }))

  return {
    entries,
    providerCount: entries.length,
    totalTabs: entries.reduce((sum, entry) => sum + entry.askCount, 0),
  }
}

export function describeTaskPlan(plan) {
  if (!plan.providerCount) {
    return t('planNoProviders')
  }

  const counts = [...new Set(plan.entries.map(entry => entry.askCount))]
  const countText = counts.length === 1
    ? t('planAskSameCount', counts[0])
    : t('planAskCustomCounts')

  return t('planSummary', [plan.providerCount, countText, plan.totalTabs])
}
