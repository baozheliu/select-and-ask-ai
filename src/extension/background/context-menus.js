import { t } from '../../shared/i18n.js'
import { callExtensionApi, getExtensionApi } from '../browser/chrome-api.js'
import { createLogger } from '../logger.js'

const logger = createLogger('context-menus')

export const MENU_ROOT_ID = 'select-ask-ai-root'
export const MENU_OPEN_OPTIONS_ID = 'select-ask-ai-open-options'
const MENU_ACTION_PREFIX = 'select-ask-ai-action:'

export function getActionIdFromMenuItemId(menuItemId) {
  if (typeof menuItemId !== 'string' || !menuItemId.startsWith(MENU_ACTION_PREFIX)) {
    return null
  }

  return menuItemId.slice(MENU_ACTION_PREFIX.length)
}

function createMenuItem(contextMenus, createProperties, extensionApi) {
  return new Promise((resolve, reject) => {
    contextMenus.create(createProperties, () => {
      const lastError = extensionApi.runtime?.lastError
      if (lastError) {
        reject(new Error(lastError.message || String(lastError)))
        return
      }
      resolve()
    })
  })
}

/**
 * 用当前快捷操作列表重建右键菜单。
 * 仅展示启用的快捷操作；没有可用操作时提供设置入口。
 */
export async function syncContextMenus(quickActions, { extensionApi = getExtensionApi() } = {}) {
  const contextMenus = extensionApi.contextMenus
  if (!contextMenus) {
    logger.warn('contextMenus API is not available')
    return
  }

  await callExtensionApi(contextMenus.removeAll.bind(contextMenus), [], extensionApi)

  const enabledActions = (quickActions || [])
    .filter(action => action.enabled)
    .sort((left, right) => left.order - right.order)

  await createMenuItem(contextMenus, {
    id: MENU_ROOT_ID,
    title: t('extName'),
    contexts: ['selection'],
  }, extensionApi)

  if (!enabledActions.length) {
    await createMenuItem(contextMenus, {
      id: MENU_OPEN_OPTIONS_ID,
      parentId: MENU_ROOT_ID,
      title: t('menuEmptyActions'),
      contexts: ['selection'],
    }, extensionApi)
    return
  }

  for (const action of enabledActions) {
    await createMenuItem(contextMenus, {
      id: `${MENU_ACTION_PREFIX}${action.id}`,
      parentId: MENU_ROOT_ID,
      title: action.name,
      contexts: ['selection'],
    }, extensionApi)
  }
}
