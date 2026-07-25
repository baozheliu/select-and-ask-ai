import { t } from './i18n.js'
import { isKnownProviderId } from './providers.js'

export const SETTINGS_STORAGE_KEY = 'settings'

export const DEFAULT_SETTINGS = Object.freeze({
  /** 已启用的 AI 提供方 id 列表 */
  enabledProviderIds: Object.freeze([]),
  /** 将同一次提问打开的标签页归为一组（默认关闭） */
  groupTabs: false,
  /** 是否已完成首次使用引导 */
  onboardingCompleted: false,
})

function isRecord(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function createSettingsValidationError(message) {
  const error = new Error(message)
  error.code = 'INVALID_PAYLOAD'

  return error
}

export function validateSettingsPatch(payload) {
  if (!isRecord(payload)) {
    return createSettingsValidationError(t('settingsMustBeObject'))
  }

  if ('enabledProviderIds' in payload) {
    if (!Array.isArray(payload.enabledProviderIds)) {
      return createSettingsValidationError(t('settingsEnabledMustBeArray'))
    }

    const unknown = payload.enabledProviderIds.filter(id => !isKnownProviderId(id))
    if (unknown.length) {
      return createSettingsValidationError(t('settingsUnknownProviders', unknown.join(', ')))
    }
  }

  if ('groupTabs' in payload && typeof payload.groupTabs !== 'boolean') {
    return createSettingsValidationError(t('settingsGroupTabsMustBeBoolean'))
  }

  if ('onboardingCompleted' in payload && typeof payload.onboardingCompleted !== 'boolean') {
    return createSettingsValidationError(t('settingsOnboardingMustBeBoolean'))
  }

  return null
}

export function normalizeSettings(settings = {}) {
  if (!isRecord(settings)) {
    return { ...DEFAULT_SETTINGS, enabledProviderIds: [] }
  }

  return {
    enabledProviderIds: Array.isArray(settings.enabledProviderIds)
      ? [...new Set(settings.enabledProviderIds.filter(isKnownProviderId))]
      : [],
    groupTabs: settings.groupTabs === true,
    onboardingCompleted: settings.onboardingCompleted === true,
  }
}

export function mergeSettings(currentSettings, settingsPatch) {
  return normalizeSettings({
    ...normalizeSettings(currentSettings),
    ...settingsPatch,
  })
}
