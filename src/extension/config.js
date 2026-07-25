import { getAllProviderMatches } from '../shared/providers.js'

export const EXTENSION_NAMESPACE = 'select-ask-ai'

export {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  mergeSettings,
  normalizeSettings,
  validateSettingsPatch,
} from '../shared/settings.js'

export {
  QUICK_ACTIONS_STORAGE_KEY,
  createDefaultQuickActions,
  normalizeQuickActions,
} from '../shared/quick-actions.js'

export const EXTENSION_PAGES = Object.freeze({
  popup: 'src/pages/popup/index.html',
  options: 'src/pages/options/index.html',
})

/** AI 站点适配器内容脚本的注入范围 */
export const CONTENT_SCRIPT_MATCHES = Object.freeze(getAllProviderMatches())

export function isHttpTabUrl(url) {
  if (!url) return false

  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}
