import { t } from '../../shared/i18n.js'
import {
  normalizeQuickAction,
  normalizeQuickActions,
  validateQuickAction,
} from '../../shared/quick-actions.js'
import { callExtensionApi, getExtensionApi } from '../browser/chrome-api.js'
import { createExtensionStorage } from '../browser/storage.js'
import { getActiveTab } from '../browser/tabs.js'
import {
  DEFAULT_SETTINGS,
  QUICK_ACTIONS_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  createDefaultQuickActions,
  mergeSettings,
  normalizeSettings,
  validateSettingsPatch,
} from '../config.js'
import { createLogger } from '../logger.js'
import { addRuntimeMessageHandlers, ExtensionMessage } from '../messaging.js'
import {
  MENU_OPEN_OPTIONS_ID,
  getActionIdFromMenuItemId,
  syncContextMenus,
} from './context-menus.js'
import { createTaskRunner } from './task-runner.js'

const logger = createLogger('background')

export function setupExtensionRuntime({
  chromeApi,
  extensionApi = chromeApi || getExtensionApi(),
  storage = createExtensionStorage({ extensionApi }),
} = {}) {
  async function getSettings() {
    const settings = await storage.get(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS)
    return normalizeSettings(settings)
  }

  async function getQuickActions() {
    const actions = await storage.get(QUICK_ACTIONS_STORAGE_KEY, null)
    return actions == null ? createDefaultQuickActions() : normalizeQuickActions(actions)
  }

  async function saveQuickActions(actions) {
    const normalized = normalizeQuickActions(actions)
    await storage.set(QUICK_ACTIONS_STORAGE_KEY, normalized)
    await syncContextMenus(normalized, { extensionApi })
    return normalized
  }

  async function updateQuickAction(actionId, patch) {
    const actions = await getQuickActions()
    const nextActions = actions.map(action => (
      action.id === actionId
        ? normalizeQuickAction({ ...action, ...patch }, action.order)
        : action
    ))

    return saveQuickActions(nextActions)
  }

  const taskRunner = createTaskRunner({ extensionApi, updateQuickAction })

  async function rebuildContextMenus() {
    try {
      await syncContextMenus(await getQuickActions(), { extensionApi })
    } catch (error) {
      logger.error('Failed to rebuild context menus', error?.message)
    }
  }

  extensionApi.runtime.onInstalled.addListener(async (details) => {
    logger.info('Extension installed or updated', details.reason)

    const currentSettings = await storage.get(SETTINGS_STORAGE_KEY, null)
    if (!currentSettings) {
      await storage.set(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS)
    }

    const currentActions = await storage.get(QUICK_ACTIONS_STORAGE_KEY, null)
    if (currentActions == null) {
      await storage.set(QUICK_ACTIONS_STORAGE_KEY, createDefaultQuickActions())
    }

    await rebuildContextMenus()

    // 首次安装时打开设置页引导用户完成初始配置
    if (details.reason === 'install') {
      await callExtensionApi(
        extensionApi.runtime.openOptionsPage.bind(extensionApi.runtime),
        [],
        extensionApi,
      )
    }
  })

  extensionApi.runtime.onStartup?.addListener(() => {
    rebuildContextMenus()
  })

  extensionApi.contextMenus?.onClicked.addListener(async (info, tab) => {
    try {
      if (info.menuItemId === MENU_OPEN_OPTIONS_ID) {
        await callExtensionApi(
          extensionApi.runtime.openOptionsPage.bind(extensionApi.runtime),
          [],
          extensionApi,
        )
        return
      }

      const actionId = getActionIdFromMenuItemId(info.menuItemId)
      if (!actionId || !tab?.id) return

      const actions = await getQuickActions()
      const action = actions.find(item => item.id === actionId)

      if (!action || !action.enabled) {
        logger.warn('Quick action not found or disabled', actionId)
        return
      }

      await taskRunner.runQuickAction({
        action,
        settings: await getSettings(),
        tab,
        selectionFallback: info.selectionText || '',
      })
    } catch (error) {
      logger.error('Failed to run quick action', error?.message)
    }
  })

  extensionApi.tabs?.onRemoved.addListener(tabId => {
    taskRunner.handleTabRemoved(tabId).catch(error => {
      logger.warn('Failed to handle removed tab', error?.message)
    })
  })

  addRuntimeMessageHandlers({
    [ExtensionMessage.getActiveTab]: async () => {
      const tab = await getActiveTab(extensionApi)
      if (!tab) return null

      return {
        id: tab.id,
        title: tab.title,
        url: tab.url,
      }
    },

    [ExtensionMessage.getSettings]: getSettings,

    [ExtensionMessage.updateSettings]: async ({ payload }) => {
      const currentSettings = await storage.get(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS)
      const nextSettings = mergeSettings(currentSettings, payload)

      await storage.set(SETTINGS_STORAGE_KEY, nextSettings)
      return nextSettings
    },

    [ExtensionMessage.getQuickActions]: getQuickActions,

    [ExtensionMessage.saveQuickActions]: async ({ payload }) => {
      return saveQuickActions(payload.actions)
    },

    [ExtensionMessage.openOptions]: async () => {
      await callExtensionApi(
        extensionApi.runtime.openOptionsPage.bind(extensionApi.runtime),
        [],
        extensionApi,
      )

      return { opened: true }
    },

    [ExtensionMessage.getTabTask]: async ({ sender }) => {
      return taskRunner.claimTabTask(sender?.tab?.id)
    },

    [ExtensionMessage.reportTaskResult]: async ({ payload, sender }) => {
      await taskRunner.reportTaskResult(sender?.tab?.id, {
        status: payload.status,
        reason: payload.reason || null,
      })

      return { recorded: true }
    },
  }, {
    extensionApi,
    validators: {
      [ExtensionMessage.updateSettings]: validateSettingsPatch,
      [ExtensionMessage.saveQuickActions]: payload => {
        if (!Array.isArray(payload?.actions)) {
          const error = new Error(t('settingsActionsMustBeArray'))
          error.code = 'INVALID_PAYLOAD'
          return error
        }

        for (const action of payload.actions) {
          const message = validateQuickAction(action)
          if (message) {
            const error = new Error(message)
            error.code = 'INVALID_PAYLOAD'
            return error
          }
        }

        return null
      },
    },
  })
}
