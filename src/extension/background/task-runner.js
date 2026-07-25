import { t } from '../../shared/i18n.js'
import { composePrompt } from '../../shared/prompt.js'
import { getProviderById, getProviderName } from '../../shared/providers.js'
import {
  TAB_CONFIRM_THRESHOLD,
  buildTaskPlan,
  describeTaskPlan,
} from '../../shared/quick-actions.js'
import { callExtensionApi, getExtensionApi } from '../browser/chrome-api.js'
import { createExtensionStorage } from '../browser/storage.js'
import { createTab } from '../browser/tabs.js'
import { createLogger } from '../logger.js'
import { createPageFeedback } from './page-feedback.js'

const logger = createLogger('task-runner')

const TASKS_STORAGE_KEY = 'pendingTabTasks'
const RUNS_STORAGE_KEY = 'activeRuns'
/** 单个标签页任务的最长等待时间，超时视为失败（覆盖慢网络下的页面加载与重试） */
const TASK_TIMEOUT_MS = 150_000

export const TaskFailureReason = Object.freeze({
  notLoggedIn: 'NOT_LOGGED_IN',
  inputNotFound: 'INPUT_NOT_FOUND',
  fillFailed: 'FILL_FAILED',
  sendFailed: 'SEND_FAILED',
  tabClosed: 'TAB_CLOSED',
  timeout: 'TIMEOUT',
})

const FAILURE_REASON_KEYS = Object.freeze({
  [TaskFailureReason.notLoggedIn]: 'failureNotLoggedIn',
  [TaskFailureReason.inputNotFound]: 'failureInputNotFound',
  [TaskFailureReason.fillFailed]: 'failureFillFailed',
  [TaskFailureReason.sendFailed]: 'failureSendFailed',
  [TaskFailureReason.tabClosed]: 'failureTabClosed',
  [TaskFailureReason.timeout]: 'failureTimeout',
})

function describeFailureReason(reason) {
  const key = FAILURE_REASON_KEYS[reason]
  return key ? t(key) : t('failureUnknown')
}

function createRunId() {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 标签页任务调度器。
 *
 * 进行中的任务保存在 storage.session 中，避免 MV3 service worker
 * 被回收后丢失状态；同时保证选中内容不会被持久化到磁盘。
 */
export function createTaskRunner({
  extensionApi = getExtensionApi(),
  sessionStorage = createExtensionStorage({ area: 'session', extensionApi }),
  feedback = createPageFeedback({ extensionApi }),
  updateQuickAction,
} = {}) {
  // 串行化 session 存储的读改写，避免并发上报时相互覆盖
  let storageQueue = Promise.resolve()

  function enqueue(operation) {
    const next = storageQueue.then(operation, operation)
    storageQueue = next.catch(error => {
      logger.error('Task state update failed', error?.message)
    })
    return next
  }

  async function readState() {
    const [tasks, runs] = await Promise.all([
      sessionStorage.get(TASKS_STORAGE_KEY, {}),
      sessionStorage.get(RUNS_STORAGE_KEY, {}),
    ])

    return { tasks: tasks || {}, runs: runs || {} }
  }

  async function writeState({ tasks, runs }) {
    await Promise.all([
      sessionStorage.set(TASKS_STORAGE_KEY, tasks),
      sessionStorage.set(RUNS_STORAGE_KEY, runs),
    ])
  }

  function formatRunProgress(run) {
    if (run.completed < run.total) {
      return t('toastProgress', [run.providerCount, run.total, run.completed, run.total])
    }

    if (!run.failed) {
      return t('toastCompleted', run.total)
    }

    const failureLines = Object.entries(run.failureSummary || {})
      .map(([key, count]) => {
        const [providerId, reason] = key.split('|')
        const providerName = getProviderName(providerId)
        const reasonText = describeFailureReason(reason)
        return count > 1
          ? t('toastFailureItemMulti', [providerName, reasonText, count])
          : t('toastFailureItem', [providerName, reasonText])
      })

    const lines = [t('toastResultSummary', [run.success, run.failed])]
    if (failureLines.length) {
      lines.push(...failureLines)
    }
    if (run.promptCopied) {
      lines.push(t('toastCopiedHint'))
    }

    return lines.join('\n')
  }

  async function notifyRunProgress(run) {
    const finished = run.completed >= run.total
    const state = finished
      ? (run.failed ? 'warning' : 'success')
      : 'progress'

    await feedback.showToast(run.originTabId, run.runId, formatRunProgress(run), state)
  }

  async function settleTask(tabId, { status, reason = null }) {
    const result = await enqueue(async () => {
      const state = await readState()
      const task = state.tasks[tabId]

      if (!task || task.settled) {
        return null
      }

      const run = state.runs[task.runId]
      task.settled = true
      delete state.tasks[tabId]

      if (run) {
        run.completed += 1

        if (status === 'success') {
          run.success += 1
        } else {
          run.failed += 1
          const key = `${task.providerId}|${reason || 'UNKNOWN'}`
          run.failureSummary = run.failureSummary || {}
          run.failureSummary[key] = (run.failureSummary[key] || 0) + 1
        }

        if (run.completed >= run.total) {
          delete state.runs[task.runId]
        }
      }

      await writeState(state)

      return { task, run }
    })

    if (!result?.run) return

    const { task, run } = result

    // 首次失败时把完整问题复制到剪贴板作为兜底，且不影响其他任务
    if (status !== 'success' && !run.promptCopied) {
      run.promptCopied = await feedback.copyText(run.originTabId, task.prompt)

      if (run.completed < run.total) {
        await enqueue(async () => {
          const state = await readState()
          if (state.runs[run.runId]) {
            state.runs[run.runId].promptCopied = run.promptCopied
            await writeState(state)
          }
        })
      }
    }

    await notifyRunProgress(run)
  }

  async function groupRunTabs(tabIds, windowId, title) {
    if (!extensionApi.tabs?.group || !tabIds.length) return

    try {
      const groupId = await callExtensionApi(
        extensionApi.tabs.group.bind(extensionApi.tabs),
        [{ tabIds, createProperties: { windowId } }],
        extensionApi,
      )

      if (extensionApi.tabGroups?.update) {
        await callExtensionApi(
          extensionApi.tabGroups.update.bind(extensionApi.tabGroups),
          [groupId, { title, collapsed: false }],
          extensionApi,
        )
      }
    } catch (error) {
      logger.warn('Failed to group tabs', error?.message)
    }
  }

  return {
    /**
     * 执行一个快捷操作：确认、开标签页、登记任务。
     */
    async runQuickAction({ action, settings, tab, selectionFallback = '' }) {
      const runId = createRunId()
      const originTabId = tab.id

      const plan = buildTaskPlan(action, settings.enabledProviderIds)

      if (!plan.totalTabs) {
        await feedback.showToast(
          originTabId,
          runId,
          t('toastNoProviders'),
          'error',
        )
        return { started: false }
      }

      // 通过页面注入读取选中内容，保留换行等原始格式；
      // 注入失败时退回右键菜单提供的选中文本
      let selection = ''
      try {
        selection = await feedback.readSelection(originTabId)
      } catch {
        selection = ''
      }
      if (!selection) {
        selection = selectionFallback
      }

      if (!selection) {
        await feedback.showToast(originTabId, runId, t('toastNoSelection'), 'error')
        return { started: false }
      }

      if (plan.totalTabs > TAB_CONFIRM_THRESHOLD && !action.skipTabWarning) {
        const { confirmed, skipFuture } = await feedback.confirmLargeRun(
          originTabId,
          t('confirmContinueQuestion', describeTaskPlan(plan)),
          action.name,
        )

        if (skipFuture && updateQuickAction) {
          await updateQuickAction(action.id, { skipTabWarning: true })
        }

        if (!confirmed) {
          return { started: false }
        }
      }

      const prompt = composePrompt({
        instruction: action.instruction,
        selection,
        pageTitle: tab.title || '',
        pageUrl: tab.url || '',
        includePageTitle: action.includePageTitle,
        includePageUrl: action.includePageUrl,
      })

      // 固定行为：在发起操作的当前窗口打开后台标签页，不新建窗口、不覆盖当前页
      const createdTabs = []
      for (const entry of plan.entries) {
        const provider = getProviderById(entry.providerId)
        if (!provider) continue

        for (let index = 0; index < entry.askCount; index += 1) {
          try {
            const createdTab = await createTab({
              url: provider.newChatUrl,
              active: false,
              windowId: tab.windowId,
            }, extensionApi)

            createdTabs.push({ tabId: createdTab.id, providerId: entry.providerId })
          } catch (error) {
            logger.error('Failed to create tab', entry.providerId, error?.message)
            createdTabs.push({ tabId: null, providerId: entry.providerId })
          }
        }
      }

      const openedTabs = createdTabs.filter(item => item.tabId != null)
      const failedToOpen = createdTabs.length - openedTabs.length

      const run = {
        runId,
        originTabId,
        actionName: action.name,
        providerCount: plan.providerCount,
        total: plan.totalTabs,
        completed: failedToOpen,
        success: 0,
        failed: failedToOpen,
        failureSummary: {},
        promptCopied: false,
        startedAt: Date.now(),
      }

      await enqueue(async () => {
        const state = await readState()

        // 所有标签页都创建失败时无需登记，避免遗留孤儿 run
        if (run.completed < run.total) {
          state.runs[runId] = run
        }

        for (const item of openedTabs) {
          state.tasks[item.tabId] = {
            runId,
            tabId: item.tabId,
            providerId: item.providerId,
            prompt,
            autoSend: action.autoSend,
            settled: false,
            createdAt: Date.now(),
          }
        }

        await writeState(state)
      })

      if (settings.groupTabs) {
        await groupRunTabs(openedTabs.map(item => item.tabId), tab.windowId, action.name)
      }

      await notifyRunProgress(run)

      // 兜底看门狗：超时未上报的任务标记为失败（service worker 存活期内有效）
      setTimeout(() => {
        for (const item of openedTabs) {
          settleTask(item.tabId, {
            status: 'failure',
            reason: TaskFailureReason.timeout,
          }).catch(error => logger.warn('Timeout settle failed', error?.message))
        }
      }, TASK_TIMEOUT_MS)

      return { started: true, totalTabs: plan.totalTabs }
    },

    /**
     * AI 页面内容脚本领取任务。已终结的任务不会再次下发，避免重复发送。
     */
    async claimTabTask(tabId) {
      if (tabId == null) return null

      const state = await readState()
      const task = state.tasks[tabId]

      if (!task || task.settled) return null

      return {
        providerId: task.providerId,
        prompt: task.prompt,
        autoSend: task.autoSend,
      }
    },

    /** AI 页面内容脚本上报执行结果 */
    async reportTaskResult(tabId, { status, reason }) {
      await settleTask(tabId, {
        status: status === 'success' ? 'success' : 'failure',
        reason,
      })
    },

    /** 标签页在完成前被关闭时按失败处理 */
    async handleTabRemoved(tabId) {
      await settleTask(tabId, {
        status: 'failure',
        reason: TaskFailureReason.tabClosed,
      })
    },
  }
}
